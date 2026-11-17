import 'dotenv/config'

export const OWNER_NUMBER = (process.env.OWNER_NUMBER || '').replace(/\D/g, '')
export const AUTH_DIR = process.env.AUTH_DIR || './data/auth'
export const PREFIX = '.'
export const LOG_LEVEL = process.env.LOG_LEVEL || 'warn'
export const GROUPS_FILE = process.env.GROUPS_FILE || './data/allowed-groups.json'

// AI (opsional) — untuk fitur .hd via 9router
export const AI_API_URL = (process.env.AI_API_URL || 'http://127.0.0.1:20128').replace(/\/+$/, '').replace(/\/v1$/, '')
export const AI_API_KEY = process.env.AI_API_KEY || ''
export const AI_MODEL = process.env.AI_MODEL || 'ag/gemini-3.1-flash-image'
export const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'coding'
