// src/features/users/hooks/useUsers.ts
import useSWR from "swr";
import axios from "axios";

export type UserItem = {
  id: string;
  nombre: string;
  apellido: string;
  legajo?: { numeroLegajo: number };
};

type UsersApiResponse = {
  data: UserItem[];
};

const fetcher = async (url: string): Promise<UsersApiResponse> => {
  const token = localStorage.getItem("token");

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export function useUsers() {
  const { data, isLoading } = useSWR<UsersApiResponse>(
    "/api/admin/users",
    fetcher,
  );

  return {
    users: data?.data ?? [],
    isLoading,
  };
}
