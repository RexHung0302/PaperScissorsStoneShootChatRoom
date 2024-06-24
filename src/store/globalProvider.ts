import { createContext } from "react";
import { GlobalInfo } from "../entities/Global";

export const initialGlobalInfo: GlobalInfo = {
  loading: false,
};

export const GlobalContext = createContext<GlobalInfo>({
  loading: false,
});