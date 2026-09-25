-- Kith & Kin Keys
-- Collects the keystone each guildmate is holding and saves it for the uploader
-- (tools/key-uploader.js), which sends it to knkmplus.netlify.app.
--
-- Works on its own. It speaks the key-sharing "languages" of the popular addons directly:
--   * BigWigs / LittleWigs / LiteKeystone ........ LibKeystone   (prefix "LibKS")
--   * Details! and addons built on Open Raid ...... LibOpenRaid   (prefix "LRS", compressed)
--   * Astral Keys / LiteKeystone .................. Astral Keys   (prefix "AstralKeys", incl. guild sync
--                                                   which relays keys of guildmates who are offline)
--   * Keystones linked in guild/party/officer/whisper chat
--   * Your own characters (read straight from your bags)
--
-- WoW only writes SavedVariables to disk on /reload or logout, so /reload before forming groups.

KithKinKeysDB = KithKinKeysDB or {}

local LibDeflate = LibStub and LibStub("LibDeflate", true)
local frame = CreateFrame("Frame")

local PREFIX_LIBKS = "LibKS"
local PREFIX_OPENRAID = "LRS"
local PREFIX_ASTRAL = "AstralKeys"

for _, prefix in ipairs({ PREFIX_LIBKS, PREFIX_OPENRAID, PREFIX_ASTRAL }) do
  C_ChatInfo.RegisterAddonMessagePrefix(prefix) -- "already registered" is fine
end

local stats = { libks = 0, openraid = 0, astral = 0, chat = 0, self = 0 }

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------

local function isSecret(value)
  return issecretvalue and issecretvalue(value) or false
end

local playerRealm = GetNormalizedRealmName() or (GetRealmName() or ""):gsub("%s", "")

local function splitName(fullName)
  if type(fullName) ~= "string" or fullName == "" then return nil end
  local name, realm = strsplit("-", fullName, 2)
  if not realm or realm == "" then
    realm = GetNormalizedRealmName() or playerRealm
  end
  return name, realm
end

-- Astral Keys counts weeks from a fixed start per region (same math as Astral Keys / LiteKeystone).
local regionStart = { [1] = 1500390000, [3] = 1500447600 } -- 1 = US, 3 = EU
local function weekStart()
  local start = regionStart[GetCurrentRegion()] or regionStart[1]
  local now = GetServerTime()
  return now - ((now - start) % 604800), math.floor((now - start) / 604800)
end

local function record(fullName, level, challengeMapID, rating, source, seenAt)
  level = tonumber(level)
  challengeMapID = tonumber(challengeMapID)
  if not level or level <= 0 or not challengeMapID or challengeMapID <= 0 then return end
  local name, realm = splitName(fullName)
  if not name then return end
  local id = name .. "-" .. realm
  seenAt = tonumber(seenAt) or GetServerTime()

  KithKinKeysDB.keys = KithKinKeysDB.keys or {}
  local existing = KithKinKeysDB.keys[id]
  if existing and (existing.at or 0) > seenAt then return end -- keep the newer report

  KithKinKeysDB.keys[id] = {
    name = name,
    realm = realm,
    level = level,
    mapID = challengeMapID,
    dungeon = C_ChallengeMode.GetMapUIInfo(challengeMapID) or "",
    rating = tonumber(rating) or 0,
    at = seenAt,
    source = source,
  }
  stats[source] = (stats[source] or 0) + 1
end

local function recordSelf()
  local mapID = C_MythicPlus.GetOwnedKeystoneChallengeMapID()
  local level = C_MythicPlus.GetOwnedKeystoneLevel()
  if mapID and level and level > 0 then
    local summary = C_PlayerInfo.GetPlayerMythicPlusRatingSummary("player")
    record(UnitName("player") .. "-" .. playerRealm, level, mapID, summary and summary.currentSeasonScore, "self")
  end
end

-- Drop keys from before this week's reset.
local function pruneOldKeys()
  local start = weekStart()
  for id, key in pairs(KithKinKeysDB.keys or {}) do
    if (key.at or 0) < start then KithKinKeysDB.keys[id] = nil end
  end
end

---------------------------------------------------------------------------
-- Asking the guild
---------------------------------------------------------------------------

local function openRaidEncode(text)
  if not LibDeflate then return nil end
  return LibDeflate:EncodeForWoWAddonChannel(LibDeflate:CompressDeflate(text, { level = 9 }))
end

local lastRequest = 0
local function requestGuildKeys()
  if not IsInGuild() or InCombatLockdown() then return end
  if GetTime() - lastRequest < 10 then return end
  lastRequest = GetTime()
  C_ChatInfo.SendAddonMessage(PREFIX_LIBKS, "R", "GUILD")          -- BigWigs & friends
  C_ChatInfo.SendAddonMessage(PREFIX_ASTRAL, "request", "GUILD")   -- Astral Keys & LiteKeystone
  local encoded = openRaidEncode("J")                               -- Details! (Open Raid)
  if encoded then C_ChatInfo.SendAddonMessage(PREFIX_OPENRAID, encoded, "GUILD") end
end

---------------------------------------------------------------------------
-- Listening
---------------------------------------------------------------------------

-- LibKeystone: "level,challengeMapID,rating" (request is "R"; hidden keys are sent as -1 and ignored)
local function onLibKS(msg, sender)
  local level, mapID, rating = msg:match("^(%d+),(%d+),(%d+)$")
  if level then record(sender, level, mapID, rating, "libks") end
end

-- Open Raid: LibDeflate-compressed text. Keystone data is "K,level,mapID,challengeMapID,classID,rating,mythicPlusMapID,specID".
-- Long messages arrive in AceComm parts: \001 first, \002 middle, \003 last.
local openRaidParts = {}
local function onOpenRaid(msg, sender)
  if not LibDeflate then return end
  local control = msg:byte(1)
  if control == 1 then openRaidParts[sender] = msg:sub(2) return end
  if control == 2 then
    if openRaidParts[sender] then openRaidParts[sender] = openRaidParts[sender] .. msg:sub(2) end
    return
  end
  if control == 3 then
    if not openRaidParts[sender] then return end
    msg = openRaidParts[sender] .. msg:sub(2)
    openRaidParts[sender] = nil
  end
  local decoded = LibDeflate:DecodeForWoWAddonChannel(msg)
  local data = decoded and LibDeflate:DecompressDeflate(decoded)
  if type(data) ~= "string" or data:sub(1, 2) ~= "K," then return end
  local _, level, _, challengeMapID, _, rating = strsplit(",", data)
  record(sender, level, challengeMapID, rating, "openraid")
end

-- Astral Keys:
--   updateV9/updateV8 unit:class:mapID:level:weeklyBest:week:rating[:faction]
--   sync6 unit:class:mapID:level:weeklyBest:week:weekTime:rating_unit:...   (guild relay, includes offline members)
--   update5 unit:class:mapID:level:weeklyBest:week:faction:rating           (whisper / Battle.net)
local function onAstral(msg, sender)
  local action, content = msg:match("^(%S*)%s*(.-)$")
  if not action or not content then return end
  local start, week = weekStart()
  if action == "updateV9" or action == "updateV8" then
    local unit, _, mapID, level, _, w, rating = strsplit(":", content)
    if tonumber(w) == week then record(unit, level, mapID, rating, "astral") end
  elseif action == "update5" then
    local unit, _, mapID, level, _, w, _, rating = strsplit(":", content)
    if tonumber(w) == week then record(unit, level, mapID, rating, "astral") end
  elseif action == "sync6" or action == "sync5" then
    for entry in content:gmatch("[^_]+") do
      local unit, _, mapID, level, _, w, weekTime, rating = strsplit(":", entry)
      if tonumber(w) == week then
        record(unit, level, mapID, rating, "astral", start + (tonumber(weekTime) or 0))
      end
    end
  end
end

-- Keystone links pasted in chat: |Hkeystone:itemID:challengeMapID:level:...|h
local function onChat(text, sender)
  if type(text) ~= "string" or isSecret(text) then return end
  for mapID, level in text:gmatch("|Hkeystone:%d+:(%d+):(%d+)") do
    record(sender, level, mapID, nil, "chat")
  end
end

local CHAT_EVENTS = {
  "CHAT_MSG_GUILD", "CHAT_MSG_OFFICER", "CHAT_MSG_PARTY", "CHAT_MSG_PARTY_LEADER",
  "CHAT_MSG_RAID", "CHAT_MSG_RAID_LEADER", "CHAT_MSG_INSTANCE_CHAT", "CHAT_MSG_INSTANCE_CHAT_LEADER",
  "CHAT_MSG_WHISPER",
}
local chatEvent = {}
for _, e in ipairs(CHAT_EVENTS) do chatEvent[e] = true; frame:RegisterEvent(e) end

frame:RegisterEvent("CHAT_MSG_ADDON")
frame:RegisterEvent("PLAYER_ENTERING_WORLD")
frame:RegisterEvent("CHALLENGE_MODE_COMPLETED")
frame:RegisterEvent("BAG_UPDATE_DELAYED")
frame:RegisterEvent("PLAYER_LOGOUT")

frame:SetScript("OnEvent", function(_, event, ...)
  if event == "CHAT_MSG_ADDON" then
    local prefix, msg, _, sender = ...
    if isSecret(msg) or isSecret(sender) or type(msg) ~= "string" then return end
    if prefix == PREFIX_LIBKS then onLibKS(msg, sender)
    elseif prefix == PREFIX_OPENRAID then onOpenRaid(msg, sender)
    elseif prefix == PREFIX_ASTRAL then onAstral(msg, sender)
    end
  elseif chatEvent[event] then
    local text, sender = ...
    onChat(text, sender)
  elseif event == "PLAYER_ENTERING_WORLD" then
    C_MythicPlus.RequestMapInfo()
    C_Timer.After(8, function() pruneOldKeys(); recordSelf(); requestGuildKeys() end)
    if not frame.ticker then
      -- Keep asking every 5 minutes while you're online.
      frame.ticker = C_Timer.NewTicker(300, function() recordSelf(); requestGuildKeys() end)
    end
  elseif event == "PLAYER_LOGOUT" then
    recordSelf()
    KithKinKeysDB.savedAt = GetServerTime()
  else
    recordSelf()
  end
end)

SLASH_KITHKINKEYS1 = "/kkkeys"
SlashCmdList.KITHKINKEYS = function()
  lastRequest = 0
  recordSelf()
  requestGuildKeys()
  C_Timer.After(6, function()
    local count = 0
    for _ in pairs(KithKinKeysDB.keys or {}) do count = count + 1 end
    print(string.format(
      "|cfff5d061Kith & Kin Keys:|r %d keystones saved (this session: BigWigs %d, Details %d, Astral Keys %d, chat %d). Type /reload to send them to the site.",
      count, stats.libks, stats.openraid, stats.astral, stats.chat))
    if not LibDeflate then print("|cfff5d061Kith & Kin Keys:|r LibDeflate missing - Details! keys can't be read.") end
  end)
end
