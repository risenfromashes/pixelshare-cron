
import { createClient } from "@supabase/supabase-js";


export interface Env {
	PUBLIC_SUPABASE_URL: string;
	PUBLIC_SUPABASE_ANON_KEY: string;
	ML_API_URL: string;
	ML_AUTH_TOKEN: string;
}

const createEmbeddings = async (env: Env) => {
	const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
	const { data, error } = await supabase.rpc('get_images_without_embedding', { modelName: 'clip' });
	if (error) {
		console.error(error);
		throw new Error(error.message);
	}

	const req = { images: data.map((d: any) => (d.url)) };

	try {
		const res = await fetch(env.ML_API_URL, {
			headers: {
				Authorization: `Bearer ${env.ML_AUTH_TOKEN}`,
				"Content-Type": "application/json"
			}, method: 'POST', body: JSON.stringify(req)
		});

		const json: any = await res.json();
		console.log(json);

		for (let i = 0; i < data.length; i++) {
			if (data[i].url === json.images[i].url) {
				await supabase.from('ImageEmbedding').insert({ imageId: data[i].id, embedding: json.images[i].embedding, model: 'clip' });
			}
		}

	} catch (e: any) {
		console.error(e);
		throw new Error(e.message);
	}
};


export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		await createEmbeddings(env);
	},
	async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			await createEmbeddings(env);
			return new Response('OK');
		} catch (e: any) {
			return new Response(e.message, { status: 500 });
		}
	}
};

