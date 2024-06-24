import { createBrowserRouter } from "react-router-dom";
import { GameHall } from "../pages/GameHall/GameHall";
import { GameRoom } from "../pages/GameRoom/GameRoom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <GameHall />,
  },
  {
    path: "/game-room/:roomId",
    element: <GameRoom />,
  },
  // 404
  {
    path: "*",
    element: <div>404</div>,
  },
]);