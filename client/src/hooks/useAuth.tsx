import {User} from "../models/User";
import { useState,useEffect } from "react";
import { fetchUser, logout as apiLogout } from "../service/api";

const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const data = await fetchUser();
                if (mounted) setUser(data);
            } catch (error) {
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const logout = async () => {
        try {
            await apiLogout();
            setUser(null);
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            // Force redirect even if API call fails
            window.location.href = '/';
        }
    };

    return { user, loading, logout };
}

export default useAuth;