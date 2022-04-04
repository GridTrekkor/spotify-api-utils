import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/.env' });
const access_token = process.env.ACCESS_TOKEN;

interface DeleteRequest {
  tracks: {
    uri: string;
  }[];
}

export const headers = {
  Authorization: `Bearer ${access_token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const getRequest = async (url: string): Promise<any> => {
  const { data } = await axios.get(url, { headers });
  return data;
};

export const postRequest = async (url: string): Promise<any> => {
  const { data } = await axios.post(url, {}, { headers });
  return data;
};

export const deleteRequest = async (url: string, req: DeleteRequest) => {
  const { data } = await axios.delete(url, { headers: headers, data: req });
  return data;
};

/*
// this function doesn't provide auth flow for a user, so can't be used to modify data
const getAuth = async (): Promise<string | undefined> => {
  try {
    const token_url = 'https://accounts.spotify.com/api/token';
    const data = qs.stringify({
      grant_type: 'client_credentials',
    });

    const response = await axios.post(token_url, data, {
      headers: {
        Authorization: `Basic ${auth_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error(error);
  }
};
*/
