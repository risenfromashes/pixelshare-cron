-- drop function if exists get_images_without_embedding (text);

create
or replace function public.get_images_without_embedding (model_ text) returns table (id bigint, url text) as $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.url
    FROM public."Image" i
    LEFT JOIN public."ImageEmbedding" ie ON i.id = ie."imageId" AND ie.model = model_
    WHERE ie."imageId" IS NULL;
END;
$$ language plpgsql;

select id, url from get_images_without_embedding('clip');