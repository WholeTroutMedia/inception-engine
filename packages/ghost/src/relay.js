"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELAY_MCP_TOOLS = exports.RelayBroadcastSchema = exports.relay = exports.RelayAgent = void 0;
var zod_1 = require("zod");
var axios_1 = __importDefault(require("axios"));
var nodemailer_1 = __importDefault(require("nodemailer"));
// ─── GHOST — RELAY Agent ──────────────────────────────────────────────────────
// Multi-channel alert orchestrator: routes notifications across Slack, Email,
// and SMS based on severity, agent type, and channel preferences.
// Agents: SENTINEL (security), ORACLE (intelligence), STUDIO (ops)
var ENV_RELAY = globalThis;
var getEnv = function (k) { var _a, _b; return (_b = (_a = ENV_RELAY.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b[k]; };
// ─── Severity → Routing rules ─────────────────────────────────────────────────
var SEVERITY_ROUTING = {
    critical: ['slack', 'email', 'sms'],
    high: ['slack', 'email'],
    medium: ['slack'],
    low: ['slack'],
    info: ['slack'],
};
var SEVERITY_EMOJI = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    info: '💡',
};
// ─── Channel Drivers ──────────────────────────────────────────────────────────
function sendSlack(alert, channel) {
    return __awaiter(this, void 0, void 0, function () {
        var token, blocks, res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = getEnv('SLACK_BOT_TOKEN');
                    if (!token)
                        return [2 /*return*/, { ok: false, error: 'SLACK_BOT_TOKEN not configured' }];
                    blocks = __spreadArray([
                        {
                            type: 'header',
                            text: { type: 'plain_text', text: "".concat(SEVERITY_EMOJI[alert.severity], " [").concat(alert.severity.toUpperCase(), "] ").concat(alert.title) },
                        },
                        { type: 'section', text: { type: 'mrkdwn', text: alert.body } },
                        {
                            type: 'context',
                            elements: __spreadArray([
                                { type: 'mrkdwn', text: "Agent: *".concat(alert.source_agent, "* | ").concat(new Date().toISOString()) }
                            ], (alert.project_id ? [{ type: 'mrkdwn', text: "Project: `".concat(alert.project_id, "`") }] : []), true),
                        }
                    ], (alert.cta_url ? [{
                            type: 'actions',
                            elements: [{
                                    type: 'button', text: { type: 'plain_text', text: 'View Details' }, url: alert.cta_url,
                                    style: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'danger' : 'primary'
                                }],
                        }] : []), true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.post('https://slack.com/api/chat.postMessage', { channel: channel, text: "".concat(SEVERITY_EMOJI[alert.severity], " ").concat(alert.title, ": ").concat(alert.body), blocks: blocks, unfurl_links: false }, { headers: { Authorization: "Bearer ".concat(token), 'Content-Type': 'application/json' } })];
                case 2:
                    res = _a.sent();
                    data = res.data;
                    return [2 /*return*/, { ok: data.ok, ts: data.ts, error: data.error }];
                case 3:
                    e_1 = _a.sent();
                    return [2 /*return*/, { ok: false, error: e_1.message }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function sendEmail(alert, to) {
    return __awaiter(this, void 0, void 0, function () {
        var clientId, refresh, adminEmail, fromName, html, transport, info, e_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    clientId = getEnv('GMAIL_CLIENT_ID');
                    refresh = getEnv('GMAIL_REFRESH_TOKEN');
                    adminEmail = (_a = getEnv('ADMIN_EMAIL')) !== null && _a !== void 0 ? _a : 'hello@inceptionengine.co';
                    fromName = (_b = getEnv('FROM_NAME')) !== null && _b !== void 0 ? _b : 'Creative Liberation Engine RELAY';
                    if (!clientId || !refresh)
                        return [2 /*return*/, { ok: false, error: 'Gmail OSAuth credentials not configured' }];
                    html = "<!DOCTYPE html><html><body style=\"background:#0a0a0f;color:#f5f0e8;font-family:Arial,sans-serif;padding:40px\">\n  <div style=\"max-width:600px;margin:0 auto\">\n    <div style=\"background:#1a1a25;border-left:4px solid ".concat(alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#b87333', ";padding:24px;border-radius:4px\">\n      <h2 style=\"margin:0 0 8px;color:").concat(alert.severity === 'critical' ? '#ef4444' : '#f5f0e8', "\">").concat(SEVERITY_EMOJI[alert.severity], " ").concat(alert.title, "</h2>\n      <p style=\"margin:0 0 16px;color:rgba(245,240,232,0.75)\">").concat(alert.body, "</p>\n      <p style=\"margin:0;font-size:12px;color:rgba(245,240,232,0.4)\">Source: ").concat(alert.source_agent, " \u00B7 ").concat(new Date().toISOString(), "</p>\n      ").concat(alert.cta_url ? "<a href=\"".concat(alert.cta_url, "\" style=\"display:inline-block;margin-top:16px;padding:10px 20px;background:#b87333;color:white;text-decoration:none;border-radius:4px;font-weight:700\">View Details \u2192</a>") : '', "\n    </div>\n  </div></body></html>");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    transport = nodemailer_1.default.createTransport({
                        service: 'gmail',
                        auth: {
                            type: 'OAuth2',
                            user: adminEmail,
                            clientId: clientId,
                            clientSecret: getEnv('GMAIL_CLIENT_SECRET'),
                            refreshToken: refresh
                        }
                    });
                    return [4 /*yield*/, transport.sendMail({
                            from: "\"".concat(fromName, "\" <").concat(adminEmail, ">"),
                            to: to,
                            subject: "[".concat(alert.severity.toUpperCase(), "] ").concat(alert.title),
                            html: html,
                        })];
                case 2:
                    info = _c.sent();
                    return [2 /*return*/, { ok: true, id: info.messageId }];
                case 3:
                    e_2 = _c.sent();
                    return [2 /*return*/, { ok: false, error: e_2.message }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function sendSMS(alert, to) {
    return __awaiter(this, void 0, void 0, function () {
        var accountSid, authToken, from, body, params, res, data, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountSid = getEnv('TWILIO_ACCOUNT_SID');
                    authToken = getEnv('TWILIO_AUTH_TOKEN');
                    from = getEnv('TWILIO_FROM_NUMBER');
                    if (!accountSid || !authToken || !from)
                        return [2 /*return*/, { ok: false, error: 'Twilio not configured' }];
                    body = "".concat(SEVERITY_EMOJI[alert.severity], " [INCEPTION/").concat(alert.severity.toUpperCase(), "] ").concat(alert.title, "\n").concat(alert.body.slice(0, 140));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    params = new URLSearchParams({ To: to, From: from, Body: body });
                    return [4 /*yield*/, axios_1.default.post("https://api.twilio.com/2010-04-01/Accounts/".concat(accountSid, "/Messages.json"), params, { auth: { username: accountSid, password: authToken } })];
                case 2:
                    res = _a.sent();
                    data = res.data;
                    return [2 /*return*/, { ok: true, sid: data.sid }];
                case 3:
                    e_3 = _a.sent();
                    return [2 /*return*/, { ok: false, error: e_3.message }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ─── RELAY Core ───────────────────────────────────────────────────────────────
var RelayAgent = /** @class */ (function () {
    function RelayAgent(defaults) {
        if (defaults === void 0) { defaults = {}; }
        var _a, _b, _c, _d, _e, _f;
        this.defaultSlackChannel = (_b = (_a = defaults.slack_channel) !== null && _a !== void 0 ? _a : getEnv('RELAY_SLACK_CHANNEL')) !== null && _b !== void 0 ? _b : '#alerts';
        this.defaultEmailTo = (_d = (_c = defaults.email_to) !== null && _c !== void 0 ? _c : getEnv('RELAY_EMAIL_TO')) !== null && _d !== void 0 ? _d : '';
        this.defaultSmsTo = (_f = (_e = defaults.sms_to) !== null && _e !== void 0 ? _e : getEnv('RELAY_SMS_TO')) !== null && _f !== void 0 ? _f : '';
    }
    RelayAgent.prototype.broadcast = function (alert, prefs) {
        return __awaiter(this, void 0, void 0, function () {
            var channels, results, attempted, tasks, ch, to, to, result, failures;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        channels = (_a = prefs === null || prefs === void 0 ? void 0 : prefs.channels) !== null && _a !== void 0 ? _a : SEVERITY_ROUTING[alert.severity];
                        results = {};
                        attempted = [];
                        console.log("[RELAY] \uD83D\uDCE1 Broadcasting [".concat(alert.severity, "] \"").concat(alert.title, "\" via: ").concat(channels.join(', ')));
                        tasks = [];
                        if (channels.includes('slack') || channels.includes('all')) {
                            ch = (_b = prefs === null || prefs === void 0 ? void 0 : prefs.slack_channel) !== null && _b !== void 0 ? _b : this.defaultSlackChannel;
                            attempted.push("slack:".concat(ch));
                            tasks.push(sendSlack(alert, ch).then(function (r) { results.slack = r; }));
                        }
                        if ((channels.includes('email') || channels.includes('all')) && ((_c = prefs === null || prefs === void 0 ? void 0 : prefs.email_to) !== null && _c !== void 0 ? _c : this.defaultEmailTo)) {
                            to = (_d = prefs === null || prefs === void 0 ? void 0 : prefs.email_to) !== null && _d !== void 0 ? _d : this.defaultEmailTo;
                            attempted.push("email:".concat(to));
                            tasks.push(sendEmail(alert, to).then(function (r) { results.email = r; }));
                        }
                        if ((channels.includes('sms') || channels.includes('all')) && ((_e = prefs === null || prefs === void 0 ? void 0 : prefs.sms_to) !== null && _e !== void 0 ? _e : this.defaultSmsTo)) {
                            to = (_f = prefs === null || prefs === void 0 ? void 0 : prefs.sms_to) !== null && _f !== void 0 ? _f : this.defaultSmsTo;
                            attempted.push("sms:".concat(to));
                            tasks.push(sendSMS(alert, to).then(function (r) { results.sms = r; }));
                        }
                        return [4 /*yield*/, Promise.allSettled(tasks)];
                    case 1:
                        _g.sent();
                        result = { alert: alert, channels_attempted: attempted, results: results, routed_at: new Date().toISOString() };
                        failures = Object.entries(results).filter(function (_a) {
                            var v = _a[1];
                            return !(v === null || v === void 0 ? void 0 : v.ok);
                        });
                        if (failures.length > 0) {
                            console.warn("[RELAY] \u26A0\uFE0F ".concat(failures.length, " channel(s) failed:"), failures.map(function (_a) {
                                var k = _a[0], v = _a[1];
                                return "".concat(k, ": ").concat(v === null || v === void 0 ? void 0 : v.error);
                            }));
                        }
                        else {
                            console.log("[RELAY] \u2705 All ".concat(attempted.length, " channels delivered"));
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // ─── Convenience wrappers ──────────────────────────────────────────────────
    RelayAgent.prototype.security = function (title, body, opts) {
        return this.broadcast(__assign({ title: title, body: body, severity: 'critical', source_agent: 'SENTINEL' }, opts));
    };
    RelayAgent.prototype.warning = function (title, body, opts) {
        return this.broadcast(__assign({ title: title, body: body, severity: 'high', source_agent: 'ORACLE' }, opts));
    };
    RelayAgent.prototype.info = function (title, body, opts) {
        return this.broadcast(__assign({ title: title, body: body, severity: 'info', source_agent: 'ORACLE' }, opts));
    };
    RelayAgent.prototype.projectUpdate = function (title, body, projectId, opts) {
        return this.broadcast(__assign({ title: title, body: body, severity: 'medium', source_agent: 'STUDIO', project_id: projectId }, opts));
    };
    return RelayAgent;
}());
exports.RelayAgent = RelayAgent;
exports.relay = new RelayAgent();
// Input validation schema for MCP
exports.RelayBroadcastSchema = zod_1.z.object({
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    severity: zod_1.z.enum(['critical', 'high', 'medium', 'low', 'info']).default('info'),
    source_agent: zod_1.z.string().default('ORACLE'),
    slack_channel: zod_1.z.string().optional(),
    email_to: zod_1.z.string().email().optional(),
    sms_to: zod_1.z.string().optional(),
    cta_url: zod_1.z.string().url().optional(),
    project_id: zod_1.z.string().optional(),
});
exports.RELAY_MCP_TOOLS = [
    {
        name: 'relay_broadcast',
        description: 'Broadcast an alert across Slack, Email, and SMS simultaneously. Severity determines which channels are used automatically.',
        inputSchema: exports.RelayBroadcastSchema,
        handler: function (input) { return __awaiter(void 0, void 0, void 0, function () {
            var v, agent;
            return __generator(this, function (_a) {
                v = exports.RelayBroadcastSchema.parse(input);
                agent = new RelayAgent({ slack_channel: v.slack_channel, email_to: v.email_to, sms_to: v.sms_to });
                return [2 /*return*/, agent.broadcast({
                        title: v.title, body: v.body, severity: v.severity,
                        source_agent: v.source_agent, cta_url: v.cta_url, project_id: v.project_id,
                    })];
            });
        }); },
        agentPermissions: ['SENTINEL', 'ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Varies by channel',
    },
];
