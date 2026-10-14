-- Also safe to run independently in the SQL Editor to repair a missing catalog RPC.
-- Exposes only published, public MOOC metadata; table privileges stay unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION public.public_mooc_catalog() RETURNS TABLE(id uuid,title text,description text,code text,domain text,is_paid boolean,pacing text,start_date date,end_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT id,title,description,code,domain,is_paid,pacing,start_date,end_date FROM public.offerings WHERE domain='mooc' AND is_public AND is_published;
$$;

REVOKE ALL ON FUNCTION public.public_mooc_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_mooc_catalog() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
