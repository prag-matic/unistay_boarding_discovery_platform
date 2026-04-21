import api from "./api";
import logger from "./logger";
import { storage } from "./storage";
import type { User } from "@/types/user.types";
import type { UniStayApiResponse } from "@/types/api.types";
import type { RefreshResponse } from "@/types/auth.types";

export async function validateToken(): Promise<User | null> {
  logger.auth.debug("validateToken");
  try {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return null;
    const response = await api.post<UniStayApiResponse<RefreshResponse>>(
      "/auth/refresh",
      {
        refreshToken,
      },
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    await storage.setToken(accessToken);
    await storage.setRefreshToken(newRefreshToken);
    return await storage.getUser<User>();
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) return null;

      const response = await api.post<UniStayApiResponse<RefreshResponse>>(
        "/auth/refresh",
        {
          refreshToken,
        },
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      await storage.setToken(accessToken);
      await storage.setRefreshToken(newRefreshToken);

      return accessToken;
    } catch (error) {
      logger.auth.error("Token refresh failed", { error });
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getAuthHeaders() {
  logger.auth.debug("getAuthHeaders");
  const token = await storage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
