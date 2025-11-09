const authHeaders = (extraHeaders = {}) => {
    const token = sessionStorage.getItem("token");
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      withCredentials: false,
    };
}

export default authHeaders;