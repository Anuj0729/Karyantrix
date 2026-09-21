"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api, {
  setAccessToken,
  clearAccessToken,
  SESSION_EXPIRED_EVENT,
} from "../lib/api-client";
import { getSocket, disconnectSocket } from "../lib/socket";
import { useToast } from "../components/ui/Toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const { toast } = useToast();
  const notificationHandlerRef = useRef(null);

  const bindNotificationListener = (socket) => {
    if (notificationHandlerRef.current) {
      socket.off("notification", notificationHandlerRef.current);
    }
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      toast(notification.message, { type: "info", title: notification.title });
      refreshUser();
    };
    notificationHandlerRef.current = handler;
    socket.on("notification", handler);
  };

  useEffect(() => {
    const token = localStorage.getItem("karyantrix_token");
    const savedUser = localStorage.getItem("karyantrix_user");

    if (token && savedUser) {
      setAccessToken(token, true);
      setUser(JSON.parse(savedUser));
      hydrateNotifications();
      refreshUser();
      bindNotificationListener(getSocket(token));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      const hadSession = !!localStorage.getItem("karyantrix_user");
      localStorage.removeItem("karyantrix_user");
      disconnectSocket();
      notificationHandlerRef.current = null;
      setUser(null);
      setNotifications([]);
      if (hadSession) {
        toast("Your session has expired. Please log in again.", { type: "info" });
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [toast]);

  const hydrateNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      const unread = (data.notifications || []).filter((n) => !n.is_read);
      setNotifications(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);      
    }
  };

  const persistSession = (token, userData) => {
    setAccessToken(token, true);
    localStorage.setItem("karyantrix_user", JSON.stringify(userData));
    setUser(userData);
    hydrateNotifications();

    bindNotificationListener(getSocket(token));
  };

  const initiateRegister = async ({ name, identifier, password }) => {
    const { data } = await api.post("/auth/register/initiate", {
      name,
      identifier,
      password,
    });
    return data;
  };

  const resendRegisterOtp = async (identifier) => {
    const { data } = await api.post("/auth/register/resend-otp", {
      identifier,
    });
    return data;
  };

  const verifyRegister = async ({ identifier, otp }) => {
    const { data } = await api.post("/auth/register/verify", {
      identifier,
      otp,
    });

    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const loginWithPassword = async (identifier, password) => {
    const { data } = await api.post("/auth/login", { identifier, password });
    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const requestLoginOtp = async (identifier) => {
    const { data } = await api.post("/auth/login/otp/request", { identifier });
    return data;
  };

  const loginWithOtp = async (identifier, otp) => {
    const { data } = await api.post("/auth/login/otp/verify", {
      identifier,
      otp,
    });
    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const googleAuth = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const requestPasswordReset = async (identifier) => {
    const { data } = await api.post("/auth/password/forgot", { identifier });
    return data;
  };

  const verifyPasswordResetOtp = async (identifier, otp) => {
    const { data } = await api.post("/auth/password/verify-reset-otp", {
      identifier,
      otp,
    });
    return data;
  };

  const resetPassword = async ({
    identifier,
    newPassword,
    confirmPassword,
  }) => {
    const { data } = await api.post("/auth/password/reset", {
      identifier,
      newPassword,
      confirmPassword,
    });
    return data;
  };

  const changePassword = async ({
    currentPassword,
    newPassword,
    confirmPassword,
  }) => {
    const { data } = await api.post("/auth/password/change", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  };

  const becomeProvider = async () => {
    const { data } = await api.post("/providers/become");
    return data;
  };

  const switchToCustomer = async () => {
    const { data } = await api.post("/providers/switch-to-customer");
    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const switchToProvider = async () => {
    const { data } = await api.post("/providers/switch-to-provider");
    persistSession(data.accessToken || data.token, data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {}
    clearAccessToken();
    localStorage.removeItem("karyantrix_user");
    disconnectSocket();
    notificationHandlerRef.current = null;
    setUser(null);
    setNotifications([]);
  };

  const updateLocalUser = (partialUser) => {
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      localStorage.setItem("karyantrix_user", JSON.stringify(next));
      return next;
    });
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (data.user) {
        localStorage.setItem("karyantrix_user", JSON.stringify(data.user));
        setUser(data.user);
      }
      return data.user;
    } catch (err) {
      return null;
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      initiateRegister,
      resendRegisterOtp,
      verifyRegister,
      loginWithPassword,
      requestLoginOtp,
      loginWithOtp,
      googleAuth,
      requestPasswordReset,
      verifyPasswordResetOtp,
      resetPassword,
      changePassword,
      becomeProvider,
      switchToCustomer,
      switchToProvider,
      refreshUser,
      updateLocalUser,
      logout,
      notifications,
      setNotifications,
    }),
    [user, loading, notifications, toast],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);