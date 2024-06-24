import { createContext } from "react";
import { AuthInfo } from "../entities/Auth";

export const initialAuthInfo: AuthInfo = {
  name: null,
  identity: null,
};

export const AuthContext = createContext<AuthInfo>({
  name: null,
  identity: null,
});