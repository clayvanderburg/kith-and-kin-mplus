-- Kith & Kin Keys
-- Collects the keystone each guildmate is holding and saves it for the uploader
-- (tools/key-uploader.js), which sends it to knkmplus.netlify.app.
--
-- Where keys come from:
--   * your own characters (read directly from your bags)
--   * guildmates running BigWigs (LibKeystone) or Details! (LibOpenRaid) -- most M+ players do
-- WoW only writes SavedVariables to disk on /reload or logout, so /reload before forming groups.

KithKinKeysDB = KithKinKeysDB or {}

local frame = CreateFrame("Frame")
local LibKeystone = LibStub and LibStub("LibKeystone", true)
local OpenRaid = LibStub and LibStub("LibOpenRaid-1.0", true)
local listener = {}

local function splitName(fullName)
  if not fullName or fullName == "" then return nil end
  local name, realm = strsplit("-", fullName, 2)
  if not realm or realm == "" then realm = GetNormalizedRealmName() or GetRealmName() end
  return name, realm
end

local function record(fullName, level, challengeMapID, rating, source)
  level = tonumber(level)
  challengeMapID = tonumber(challengeMapID)
  if not fullName or not level or level <= 0 or not challengeMapID or challengeMapID == 0 then return end
  local name, realm = splitName(fullName)
  if not name then return end
  local dungeon = C_ChallengeMode.GetMapUIInfo(challengeMapID)
  KithKinKeysDB.keys = KithKinKeysDB.keys or {}
  KithKinKeysDB.keys[name .. "-" .. realm] = {
    name = name,
    realm = realm,
    level = level,
    mapID = challengeMapID,
    dungeon = dungeon or "",
    rating = tonumber(rating) or 0,
    at = GetServerTime(),
    source = source,
  }
end

local function recordSelf()
  local mapID = C_MythicPlus.GetOwnedKeystoneChallengeMapID()
  local level = C_MythicPlus.GetOwnedKeystoneLevel()
  if mapID and level and level > 0 then
    record(UnitName("player"), level, mapID, nil, "self")
  end
end

local function requestGuildKeys()
  if not IsInGuild() then return end
  if LibKeystone then pcall(LibKeystone.Request, "GUILD") end
  if OpenRaid and OpenRaid.RequestKeystoneDataFromGuild then pcall(OpenRaid.RequestKeystoneDataFromGuild) end
end

local function harvestOpenRaid()
  if not (OpenRaid and OpenRaid.GetAllKeystonesInfo) then return end
  local ok, all = pcall(OpenRaid.GetAllKeystonesInfo)
  if not ok or type(all) ~= "table" then return end
  for unitName, info in pairs(all) do
    if type(info) == "table" then
      record(unitName, info.level, info.challengeMapID or info.mythicPlusMapID, info.rating, "details")
    end
  end
end

-- BigWigs / LibKeystone: callback(keyLevel, keyChallengeMapID, playerRating, playerName, channel)
if LibKeystone then
  LibKeystone.Register(listener, function(keyLevel, keyChallengeMapID, playerRating, playerName)
    record(playerName, keyLevel, keyChallengeMapID, playerRating, "bigwigs")
  end)
end

-- Details! / LibOpenRaid: KeystoneUpdate(unitName, keystoneInfo, allKeystoneInfo)
if OpenRaid and OpenRaid.RegisterCallback then
  function listener.OnKeystoneUpdate(...)
    local args = { ... }
    if args[1] == listener then table.remove(args, 1) end -- tolerate method-style calls
    local unitName, info = args[1], args[2]
    if type(unitName) == "string" and type(info) == "table" then
      record(unitName, info.level, info.challengeMapID or info.mythicPlusMapID, info.rating, "details")
    end
  end
  pcall(OpenRaid.RegisterCallback, listener, "KeystoneUpdate", "OnKeystoneUpdate")
end

frame:RegisterEvent("PLAYER_ENTERING_WORLD")
frame:RegisterEvent("CHALLENGE_MODE_COMPLETED")
frame:RegisterEvent("BAG_UPDATE_DELAYED")
frame:RegisterEvent("PLAYER_LOGOUT")
frame:SetScript("OnEvent", function(_, event, isLogin, isReload)
  if event == "PLAYER_ENTERING_WORLD" then
    C_MythicPlus.RequestMapInfo()
    C_Timer.After(8, function() recordSelf(); requestGuildKeys() end)
    if not frame.ticker then
      -- Keep asking every 5 minutes while you're online.
      frame.ticker = C_Timer.NewTicker(300, function() recordSelf(); requestGuildKeys(); harvestOpenRaid() end)
    end
  elseif event == "PLAYER_LOGOUT" then
    recordSelf()
    harvestOpenRaid()
    KithKinKeysDB.savedAt = GetServerTime()
  else
    recordSelf()
  end
end)

SLASH_KITHKINKEYS1 = "/kkkeys"
SlashCmdList.KITHKINKEYS = function()
  recordSelf()
  requestGuildKeys()
  C_Timer.After(5, function()
    harvestOpenRaid()
    local count = 0
    for _ in pairs(KithKinKeysDB.keys or {}) do count = count + 1 end
    print(string.format("|cfff5d061Kith & Kin Keys:|r %d keystones collected. Type /reload to send them to the site.", count))
  end)
end
