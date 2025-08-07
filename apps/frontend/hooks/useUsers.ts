import { useEffect, useState } from 'react';
import { UsersService } from '../services/api/users.service';
import { PaginatedResponse, User, UsersQueryParams } from '../types/api';

export function useUsers(params?: UsersQueryParams) {
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (queryParams?: UsersQueryParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await UsersService.getUsers(queryParams);
      setUsers(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: any) => {
    setLoading(true);
    try {
      await UsersService.createUser(userData);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, userData: any) => {
    setLoading(true);
    try {
      await UsersService.updateUser(id, userData);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    setLoading(true);
    try {
      await UsersService.deleteUser(id);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(params);
  }, [JSON.stringify(params)]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refetch: () => fetchUsers(params),
  };
}

export function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await UsersService.getUser(id);
      setUser(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  }, [id]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
