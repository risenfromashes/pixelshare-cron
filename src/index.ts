import { createClient } from '@supabase/supabase-js';

export interface Env {
	PUBLIC_SUPABASE_URL: string;
	PUBLIC_SUPABASE_ANON_KEY: string;
	ML_API_URL: string;
	ML_API_URL2: string;
	ML_AUTH_TOKEN: string;
}

const createEmbeddings = async (env: Env, model_: string) => {
	const apiUrl: Map<string, string> = new Map();
	apiUrl.set('clip', env.ML_API_URL);
	apiUrl.set('dinov2', env.ML_API_URL2);
	const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
	let { data, error } = await supabase.rpc('get_images_without_embedding', { modelName: model_ });
	if (error) {
		console.error(error);
		throw new Error(error.message);
	}

	if (!data || data.length === 0) {
		return;
	}

	data = data.slice(0, Math.min(data.length, 20));
	const req = { images: data.map((d: any) => d.url) };

	const url = apiUrl.get(model_);
	if (url === undefined) {
		return;
	}
	try {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${env.ML_AUTH_TOKEN}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: JSON.stringify(req),
		});

		const json: any = await res.json();
		console.log(json);

		for (let i = 0; i < json.images.length; i++) {
			if (data[i].url === json.images[i].url) {
				await supabase.from('ImageEmbedding').insert({ imageId: data[i].id, embedding: json.images[i].embedding, model: model_ });
			}
		}
	} catch (e: any) {
		console.error(e);
		throw new Error(e.message);
	}
};

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		await createEmbeddings(env, 'clip');
		await createEmbeddings(env, 'dinov2');
	},
	async fetch(event: FetchEvent, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			await createEmbeddings(env, 'clip');
			await createEmbeddings(env, 'dinov2');
			return new Response('OK');
		} catch (e: any) {
			return new Response(e.message, { status: 500 });
		}
	},
};
