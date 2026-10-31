import 'dotenv/config'

export const OWNER_NUMBER = (process.env.OWNER_NUMBER || '').replace(/\D/g, '')
export const AUTH_DIR = process.env.AUTH_DIR || './data/auth'
export const PREFIX = '.'
export const LOG_LEVEL = process.env.LOG_LEVEL || 'warn'
export const GROUPS_FILE = process.env.GROUPS_FILE || './data/allowed-groups.json'
