import request from 'supertest';
import app from '../src/index';

describe('GET /weather', () => {
  it('should return weather data for specified cities', async () => {
    const res = await request(app)
      .get('/weather')
      .query({ cities: ['London', 'Paris', 'New York'] });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(3);
  });
});