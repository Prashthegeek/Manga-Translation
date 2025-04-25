import {GenerativeLanguageServiceClient} from '@google/generative-ai';
const client = new GenerativeLanguageServiceClient();
const [res] = await client.listModels({parent: 'projects/your‑project/locations/your‑location'});
console.log(res.models.map(m => m.name));
