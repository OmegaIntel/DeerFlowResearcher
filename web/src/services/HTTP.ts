import { API_BASE_URL } from "~/lib/constant";
import { getAuthToken } from "~/services/auth";

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}


export const fetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // if (response.status === 401) {
    //   return handleRefreshToken(url, options);
    // }
    console.log('HTTP-------------', response);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};

export const fileFetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // if (response.status === 401) {
    //   return handleRefreshToken(url, options);
    // }
    console.log('HTTP-------------', response);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};
