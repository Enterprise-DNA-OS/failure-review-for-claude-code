create table analyses (
 id uuid primary key default gen_random_uuid(), code text not null unique check(length(trim(code))>0),
 name text not null check(length(trim(name))>0), owner text not null check(length(trim(owner))>0),
 method text not null default 'PFMEA' check(method in ('PFMEA','DFMEA')),
 rating_basis text not null default '', review_due date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), analysis_id uuid not null references analyses(id),
 filename text not null, sha256 text not null, mapping jsonb not null, source_base64 text not null,
 row_count integer not null check(row_count>0), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(analysis_id,sha256)
);
create table failures (
 id uuid primary key default gen_random_uuid(), analysis_id uuid not null references analyses(id),
 code text not null unique check(length(trim(code))>0), process_step text not null, function_text text not null,
 mode text not null check(length(trim(mode))>0), effect text not null, cause text not null,
 prevention text not null default '', detection text not null default '',
 severity smallint check(severity between 1 and 10), occurrence smallint check(occurrence between 1 and 10),
 detection_rating smallint check(detection_rating between 1 and 10),
 action_priority text check(action_priority in ('H','M','L')), priority_basis text not null default '',
 revision integer not null default 1, import_id uuid references import_batches(id), source_row integer, source_values jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table actions (
 id uuid primary key default gen_random_uuid(), failure_id uuid not null references failures(id),
 code text not null unique check(length(trim(code))>0), description text not null check(length(trim(description))>0),
 owner text not null check(length(trim(owner))>0), due date not null,
 status text not null default 'open' check(status in ('open','completed','verified')),
 completion_evidence text, completed_by text, completed_at timestamptz, completion_revision integer,
 verification_evidence text, verified_by text, verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status='open' or (length(trim(completion_evidence))>0 and completed_by is not null and completed_at is not null and completion_revision is not null)),
 check(status<>'verified' or (length(trim(verification_evidence))>0 and verified_by is not null and verified_at is not null and verified_by<>completed_by))
);
create table controls (
 id uuid primary key default gen_random_uuid(), failure_id uuid not null references failures(id),
 code text not null unique, characteristic text not null, method text not null, frequency text not null,
 reaction text not null, owner text not null, failure_revision integer not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table reviews (
 id uuid primary key default gen_random_uuid(), failure_id uuid not null references failures(id), revision integer not null,
 actor text not null, evidence text not null check(length(trim(evidence))>0), rationale text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), analysis_id uuid not null references analyses(id),
 actor text not null, body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 operation text not null, actor text not null, before_row jsonb, after_row jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index failures_analysis on failures(analysis_id);
create index failures_import on failures(import_id);
create index actions_failure on actions(failure_id);
create index actions_due_open on actions(due) where status <> 'verified';
create index controls_failure on controls(failure_id);
create index reviews_failure on reviews(failure_id,revision);
create index notes_analysis on notes(analysis_id);
create index imports_analysis on import_batches(analysis_id);
create index audit_record on audit_log(record_id,created_at);
create function change_stamp() returns trigger language plpgsql as $$
begin
 new.updated_at=now();
 if TG_TABLE_NAME='failures' and TG_OP='UPDATE' then new.revision=old.revision+1; end if;
 return new;
end $$;
create function audit_change() returns trigger language plpgsql as $$
declare who text;
begin
 who=nullif(current_setting('app.actor',true),'');
 if who is null then raise exception 'A named actor is required'; end if;
 insert into audit_log(entity,record_id,operation,actor,before_row,after_row)
 values(TG_TABLE_NAME,new.id,TG_OP,who,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
create function forbid_change() returns trigger language plpgsql as $$
begin raise exception 'History is append-only; append a correction'; end $$;
do $$ declare tab text; begin
 foreach tab in array array['analyses','failures','actions','controls','reviews','notes','import_batches'] loop
 execute format('create trigger stamp before update on %I for each row execute function change_stamp()',tab);
 execute format('create trigger audit after insert or update on %I for each row execute function audit_change()',tab);
 execute format('create trigger no_delete before delete on %I for each row execute function forbid_change()',tab);
 end loop;
 foreach tab in array array['reviews','notes','import_batches','audit_log'] loop
 execute format('create trigger immutable before update or delete on %I for each row execute function forbid_change()',tab);
 end loop;
 foreach tab in array array['analyses','failures','actions','controls','reviews','notes','import_batches','audit_log'] loop
 execute format('alter table %I enable row level security',tab);
 execute format('revoke all on %I from public',tab);
 end loop;
end $$;
create view failure_register with (security_invoker=true) as
 select f.*, a.code analysis_code,a.name analysis,a.owner analysis_owner,a.method,a.rating_basis,a.review_due,
 f.severity*f.occurrence*f.detection_rating rpn,
 exists(select 1 from reviews r where r.failure_id=f.id and r.revision=f.revision) reviewed,
 (select count(*)::int from actions ac where ac.failure_id=f.id and ac.status<>'verified') open_actions,
 (select count(*)::int from controls c where c.failure_id=f.id and c.failure_revision=f.revision) current_controls
 from failures f join analyses a on a.id=f.analysis_id;
create view action_register with (security_invoker=true) as
 select ac.*,f.code failure,f.mode,a.code analysis,f.revision current_revision,
 ac.due<current_date and ac.status<>'verified' overdue,
 ac.status<>'open' and ac.completion_revision<>f.revision evidence_stale
 from actions ac join failures f on f.id=ac.failure_id join analyses a on a.id=f.analysis_id;
create view review_findings with (security_invoker=true) as
 select code,analysis_code analysis,'R01' rule,'Rating or rating basis missing' issue from failure_register
 where severity is null or occurrence is null or detection_rating is null or rating_basis=''
 union all select code,analysis_code,'R02','Priority or its basis missing' from failure_register where action_priority is null or priority_basis=''
 union all select code,analysis_code,'R03','Current revision needs engineering review' from failure_register where not reviewed
 union all select code,analysis_code,'R04','No current control-plan link' from failure_register where current_controls=0
 union all select code,analysis_code,'R05','Prevention or detection evidence missing' from failure_register where prevention='' or detection=''
 union all select code,analysis,'R06','Action past due' from action_register where overdue
 union all select code,analysis,'R07','Completion evidence belongs to an older failure revision' from action_register where evidence_stale
 union all select code,code,'R08','Analysis review date missing or passed' from analyses where review_due is null or review_due<current_date;
revoke all on failure_register,action_register,review_findings from public;
