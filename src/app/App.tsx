import { useAuth } from "@/features/auth/hooks/useAuth";
import LoginPage from "@/features/auth/pages/LoginPage";
import BoardPage from "@/features/board/pages/BoardPage";

export default function App() {
  const { currentUser } = useAuth();

  if (!currentUser) 
    return <LoginPage />;

  return <BoardPage key={currentUser.id} userId={currentUser.id} />;
}