"use client";

import { PointCategory } from "@/types/point";
import { create } from "zustand";

interface Bounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export type WorkspacePreset = "field-map" | "collection-inbox" | "trust-reports";
export type MobileWorkspaceTab = "navigator" | "canvas" | "inbox";

interface MapState {
  selectedCategory: PointCategory | "all";
  query: string;
  bounds: Bounds | null;
  registrationPosition: { lat: number; lng: number } | null;
  workspacePreset: WorkspacePreset;
  mobileTab: MobileWorkspaceTab;
  setSelectedCategory: (category: PointCategory | "all") => void;
  setQuery: (query: string) => void;
  setBounds: (bounds: Bounds) => void;
  setRegistrationPosition: (position: { lat: number; lng: number } | null) => void;
  setWorkspacePreset: (preset: WorkspacePreset) => void;
  setMobileTab: (tab: MobileWorkspaceTab) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedCategory: "all",
  query: "",
  bounds: null,
  registrationPosition: null,
  workspacePreset: "field-map",
  mobileTab: "canvas",
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setQuery: (query) => set({ query }),
  setBounds: (bounds) => set({ bounds }),
  setRegistrationPosition: (position) => set({ registrationPosition: position }),
  setWorkspacePreset: (preset) => set({ workspacePreset: preset }),
  setMobileTab: (tab) => set({ mobileTab: tab }),
}));
