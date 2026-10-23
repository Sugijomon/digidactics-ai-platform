-- Explicit opt-in fixture for verified local/staging only; never production.
-- Supply app.environment and app.pilot_password in the same SQL transaction.
DO $$ BEGIN
  IF current_setting('app.environment', true) NOT IN ('local','staging')
    OR current_setting('app.environment', true) IS NULL THEN
    RAISE EXCEPTION 'local_or_staging_opt_in_required';
  END IF;
  IF length(COALESCE(current_setting('app.pilot_password',true),'')) < 24 THEN
    RAISE EXCEPTION 'random_test_password_required';
  END IF;
END $$;

INSERT INTO public.organizations(id,name,plan_type) VALUES
 ('20261023-0000-4000-8000-000000000001','SAI Controlled Pilot TEST A','shadow_only'),
 ('20261023-0000-4000-8000-000000000002','SAI Controlled Pilot TEST B','shadow_only')
ON CONFLICT (id) DO NOTHING;

-- Test accounts use reserved .invalid addresses; no email is sent.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('20261023-0000-4000-8000-000000000011'::uuid,'dpo','dpo', '20261023-0000-4000-8000-000000000001'::uuid),
  ('20261023-0000-4000-8000-000000000012'::uuid,'admin','org_admin','20261023-0000-4000-8000-000000000001'::uuid),
  ('20261023-0000-4000-8000-000000000013'::uuid,'user','user','20261023-0000-4000-8000-000000000001'::uuid),
  ('20261023-0000-4000-8000-000000000014'::uuid,'super','super_admin','20261023-0000-4000-8000-000000000001'::uuid),
  ('20261023-0000-4000-8000-000000000015'::uuid,'other','dpo','20261023-0000-4000-8000-000000000002'::uuid)
 ) AS t(id,login,role,org_id) LOOP
  INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,
    email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
    confirmation_token,recovery_token,email_change_token_new,email_change)
  VALUES('00000000-0000-0000-0000-000000000000',r.id,'authenticated','authenticated',
    r.login || '@sai-pilot.staging.invalid',
    extensions.crypt(current_setting('app.pilot_password'),extensions.gen_salt('bf')),
    now(),'{"provider":"email","providers":["email"]}',
    '{"full_name":"Controlled pilot TEST account"}',now(),now(),'','','','')
  ON CONFLICT(id) DO NOTHING;
  UPDATE auth.users SET encrypted_password=extensions.crypt(current_setting('app.pilot_password'),extensions.gen_salt('bf')),
    updated_at=now() WHERE id=r.id AND email=r.login || '@sai-pilot.staging.invalid';
  INSERT INTO auth.identities(user_id,provider_id,identity_data,provider,created_at,updated_at)
  VALUES(r.id,r.id::text,jsonb_build_object('sub',r.id::text,'email',r.login || '@sai-pilot.staging.invalid','email_verified',true),'email',now(),now())
  ON CONFLICT(provider_id,provider) DO NOTHING;
  INSERT INTO public.user_roles(user_id,org_id,role)
  VALUES(r.id,r.org_id,r.role) ON CONFLICT DO NOTHING;
 END LOOP;
END $$;

INSERT INTO public.scan_wave(id,org_id,name,status,starts_at,ends_at,wave_token_hash,product_code,method_version) VALUES
 ('20261023-0000-4000-8000-000000000021','20261023-0000-4000-8000-000000000001','Controlled pilot TEST SAI','active',now()-interval '1 day',now()+interval '30 days',extensions.digest('sai-pilot-20261023','sha256'),'sai','sai-v8.1'),
 ('20261023-0000-4000-8000-000000000022','20261023-0000-4000-8000-000000000001','Controlled pilot TEST AI-Foto','active',now()-interval '1 day',now()+interval '30 days',extensions.digest('ai-foto-pilot-20261023','sha256'),'ai_foto','ai-foto-scan-v1'),
 ('20261023-0000-4000-8000-000000000023','20261023-0000-4000-8000-000000000002','Controlled pilot TEST other org','active',now()-interval '1 day',now()+interval '30 days',extensions.digest('other-pilot-20261023','sha256'),'ai_foto','ai-foto-scan-v1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scan_scoring_config(org_id,scoring_config_key,methodology_version,config_json,dashboard_min_cell_size,is_active)
VALUES('20261023-0000-4000-8000-000000000001','controlled-pilot-test','v8.1','{"priority_review_threshold":40,"toxic_shadow_threshold":50,"toxic_exposure_threshold":50}',5,true)
ON CONFLICT (org_id) WHERE is_active=true DO NOTHING;
