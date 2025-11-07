import React, { createContext, useContext } from "react";
import { Registry } from "@cosmjs/proto-signing";
import { globalRegistry } from "@/utils/registry";

interface RegistryContextType {
  registry: Registry;
}

const RegistryContext = createContext<RegistryContextType | undefined>(undefined);

export const RegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RegistryContext.Provider value={{ registry: globalRegistry }}>
      {children}
    </RegistryContext.Provider>
  );
};

export const useRegistry = () => {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error("useRegistry must be used within RegistryProvider");
  }
  return context.registry;
};
