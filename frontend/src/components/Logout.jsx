import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Logout() {
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger fade-out
    setFadeOut(true);

    // Delay to match transition animation
    const timer = setTimeout(() => {
      // Clear session/local storage
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect smoothly after animation
      navigate("/login", { replace: true });
    }, 600); // match CSS transition duration

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`flex items-center justify-center min-h-screen bg-gray-100 transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center animate-fadeIn">
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">
          Logging you out...
        </h1>
        <p className="text-gray-500 text-sm">
          Please wait while we safely sign you out.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

export default Logout;
