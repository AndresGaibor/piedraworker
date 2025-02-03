/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createClient } from '@libsql/client';

export default {
	async fetch(request, env, ctx) {
		const { TURSO_URL, TURSO_AUTH_TOKEN } = env;
		const client = createClient({
			url: TURSO_URL,
			authToken: TURSO_AUTH_TOKEN,
		});

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Max-Age': '86400', // Cache preflight por 1 día
				},
			});
		}

		// Crear la tabla si no existe
		try {
			await client.execute(`
        CREATE TABLE IF NOT EXISTS ubicaciones_piedras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitud REAL NOT NULL,
          longitud REAL NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);
		} catch (error) {
			return new Response(`Error creating table: ${error.message}`, { status: 500 });
		}

		// Manejo de la solicitud según el método HTTP
		if (request.method === 'POST') {
			// Se espera recibir un JSON con: latitud, longitud y opcionalmente timestamp.
			let data;
			try {
				data = await request.json();
			} catch (error) {
				return new Response('Invalid JSON body', { status: 400 });
			}

			// Si no se provee el timestamp, usar la fecha y hora actuales en formato ISO.
			const ts = data.timestamp || new Date().toISOString();

			const sql = 'INSERT INTO ubicaciones_piedras (latitud, longitud, timestamp) VALUES (?, ?, ?);';
			try {
				await client.execute(sql, [data.latitud, data.longitud, ts]);
				return new Response('Data inserted successfully!', { status: 200 });
			} catch (error) {
				return new Response(`Error inserting data: ${error.message}`, { status: 500 });
			}
		} else if (request.method === 'GET') {
			// Para obtener los registros almacenados
			const sql = 'SELECT * FROM ubicaciones_piedras;';
			try {
				const result = await client.execute(sql);
				const rows = result.rows || result.results || [];
				return new Response(JSON.stringify(rows), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(`Error retrieving data: ${error.message}`, { status: 500 });
			}
		} else {
			return new Response('Method not allowed', { status: 405 });
		}
	},
};
