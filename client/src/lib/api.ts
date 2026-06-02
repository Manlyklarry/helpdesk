import axios from 'axios'

export function axiosError(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.error
    ? String(err.response.data.error)
    : fallback
}
