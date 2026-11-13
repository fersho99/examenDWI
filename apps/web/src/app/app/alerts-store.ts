"use client";

import { AlertEventSchema, AlertRuleSchema, INITIAL_COINS, type AlertEvent, type AlertRule } from "@bloque21/shared";
import { z } from "zod";
import { useLocalState } from "@/lib/local-store";

const RulesSchema = z.array(AlertRuleSchema);
const EventsSchema = z.array(AlertEventSchema);
const EMPTY_RULES: AlertRule[] = [];
const EMPTY_EVENTS: AlertEvent[] = [];

/** Se guardan los últimos avisos para mostrarlos como historial. */
export const MAX_EVENTS = 30;

export function useAlertRules() {
  return useLocalState("bloque21.alerts", RulesSchema, EMPTY_RULES);
}

export function useAlertEvents() {
  return useLocalState("bloque21.alert-events", EventsSchema, EMPTY_EVENTS);
}

export function coinName(coinId: string) {
  return INITIAL_COINS.find((coin) => coin.id === coinId)?.name ?? coinId;
}
