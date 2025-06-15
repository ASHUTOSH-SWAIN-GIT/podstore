export const apiClient = {
  async fetchToken(userId: string, sessionId: string): Promise<string> {
    const res = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionId }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch token from server");
    }

    const data = await res.json();
    return data.token;
  },
};
