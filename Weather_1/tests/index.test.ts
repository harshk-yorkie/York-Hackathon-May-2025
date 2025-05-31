import request from 'supertest';
import app from '../src/index';

describe('GET /search', () => {
  it('responds with json', async () => {
    const response = await request(app)
      .get('/search')
      .query({ query: 'London' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('list');
  });
});