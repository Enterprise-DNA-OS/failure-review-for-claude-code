select set_config('app.actor','Fictional demo seed',true);
do $$
declare a uuid; b uuid; f uuid; g uuid; h uuid;
begin
 if exists(select 1 from analyses where code='DEMO-FILL') then return; end if;
 insert into analyses(code,name,owner,rating_basis,review_due) values('DEMO-FILL','Filling line','Ari Patel','Fictional site rating catalogue v1',current_date-7) returning id into a;
 insert into analyses(code,name,owner,rating_basis,review_due,created_at,updated_at) values('DEMO-PACK','Packing line','Morgan Lee','Fictional site rating catalogue v1',current_date+14,now()-interval '45 days',now()-interval '45 days') returning id into b;
 insert into failures(analysis_id,code,process_step,function_text,mode,effect,cause,prevention,detection,severity,occurrence,detection_rating,action_priority,priority_basis)
 values(a,'FILL-01','Fill','Dispense declared volume','Underfilled container','Incorrect declared quantity','Worn valve','Valve service routine','Hourly weight check',8,4,6,'H','Fictional team-assigned priority, not an AP lookup') returning id into f;
 insert into failures(analysis_id,code,process_step,function_text,mode,effect,cause,prevention,detection,severity,occurrence,detection_rating,action_priority,priority_basis)
 values(a,'FILL-02','Seal','Keep the lid secure','Loose lid','Leak in storage','Worn jaw','Jaw setup checklist','Sample leak check',9,2,3,'M','Fictional team-assigned priority, not an AP lookup') returning id into g;
 insert into failures(analysis_id,code,process_step,function_text,mode,effect,cause,created_at,updated_at)
 values(b,'PACK-01','Label','Apply correct label','Wrong label','Wrong product identified','Uncontrolled label change',now()-interval '45 days',now()-interval '45 days') returning id into h;
 insert into actions(failure_id,code,description,owner,due) values(f,'ACT-01','Trial a valve wear check','Ari Patel',current_date-3),(g,'ACT-02','Verify the jaw setup method','Morgan Lee',current_date+4),(h,'ACT-03','Review label clearance records','Ari Patel',current_date-1);
 insert into controls(failure_id,code,characteristic,method,frequency,reaction,owner,failure_revision)
 values(f,'CP-01','Filled weight','Calibrated scale check','Hourly','Hold affected batch and notify supervisor','Ari Patel',1);
 insert into reviews(failure_id,revision,actor,evidence) values(f,1,'Fictional engineering reviewer','Demo workshop notes 01');
 insert into notes(analysis_id,actor,body) values(a,'Ari Patel','Fictional demo: valve check trial awaiting engineering review.');
end $$;
