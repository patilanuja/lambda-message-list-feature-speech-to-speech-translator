'use strict';

import pg from 'pg';
const { Client } = pg;

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

export const handler = async (event, context) => {
    console.log('Event: ' + JSON.stringify(event));
    console.log('Context: ' + JSON.stringify(context));
    try {
        let requester = (await client.query('select id, uid, name, language from lingualol.user where uid = $1', [JSON.parse(event.body).requester])).rows[0];
        let respondent = (await client.query('select id, uid, name, language from lingualol.user where uid = $1', [JSON.parse(event.body).respondent])).rows[0];
        let result = await client.query('select id, from_, to_, source, target, created from lingualol.message where from_ in ($1, $2) and to_ in ($1, $2) and target is not null',
            [JSON.parse(event.body).requester, JSON.parse(event.body).respondent]);
        let messages = result.rows.map(r => {
            return {
                id: r.id,
                author: r.from_ === requester.uid ? requester.name : respondent.name,
                direction: r.from_ === requester.uid ? 'out' : 'in',
                filename: r.from_ === requester.uid ? r.source : r.target,
                timestamp: r.created
            }
        });
        messages.sort((a, b) => a.timestamp - b.timestamp);
        let body = {
            requester: {
                uid: requester.uid,
                name: requester.name
            },
            respondent: {
                uid: respondent.uid,
                name: respondent.name
            },
            messages: messages
        }
        let response = JSON.stringify(body);
        console.log('Response: ' + response);
        return {
            statusCode: 200,
            body: response,
        };
    } catch (error) {
        console.error(error)
        return {
            statusCode: 500
        };
    }
};
