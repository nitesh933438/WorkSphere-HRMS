import { useAuth as useAuthContext } from "../context/AuthContext";

/*
|--------------------------------------------------------------------------
| USE AUTH HOOK
|--------------------------------------------------------------------------
*/

export const useAuth = () => {
  return useAuthContext();
};

export default useAuth;