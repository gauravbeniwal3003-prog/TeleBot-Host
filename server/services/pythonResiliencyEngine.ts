import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * TeleBot Host Transparent Python Resiliency Engine
 * 
 * Automatically ensures all user-uploaded Python bots run with production-grade network timeouts,
 * connection pooling, and startup handshake retries WITHOUT requiring the user to modify
 * a single line of their code.
 */
export class PythonResiliencyEngine {
  private static hooksDir: string | null = null;

  public static getHooksDir(): string {
    if (this.hooksDir && fs.existsSync(this.hooksDir)) {
      return this.hooksDir;
    }

    // Use standard host path if writable, otherwise fallback to OS tmp directory
    const preferredPath = '/opt/telebot-host/runtime_hooks';
    let targetDir = preferredPath;
    try {
      fs.mkdirSync(preferredPath, { recursive: true });
    } catch {
      targetDir = path.join(os.tmpdir(), 'telebot_runtime_hooks');
      fs.mkdirSync(targetDir, { recursive: true });
    }

    this.hooksDir = targetDir;
    this.writeSiteCustomize(targetDir);
    return targetDir;
  }

  private static writeSiteCustomize(targetDir: string) {
    const siteCustomizePath = path.join(targetDir, 'sitecustomize.py');
    const pythonCode = `# ==============================================================================
# TeleBot Host - Transparent Python Network Resiliency Engine
# Auto-adjusts connection timeouts for standard Python libraries (python-telegram-bot,
# httpx, httpcore, requests, aiohttp, urllib3) so user bots run seamlessly 24/7.
# ==============================================================================
import sys
import socket
import builtins

# 1. Global Socket Timeout Default (60.0s)
try:
    socket.setdefaulttimeout(60.0)
except Exception:
    pass

_orig_import = builtins.__import__
_patched_modules = set()

def _patch_httpx():
    if 'httpx' in _patched_modules:
        return
    _patched_modules.add('httpx')
    try:
        import httpx
        if hasattr(httpx, '_config') and hasattr(httpx._config, 'DEFAULT_TIMEOUT_CONFIG'):
            httpx._config.DEFAULT_TIMEOUT_CONFIG = httpx.Timeout(60.0, connect=60.0, read=60.0, write=60.0, pool=60.0)
        
        # Patch AsyncClient default timeout
        if hasattr(httpx, 'AsyncClient'):
            _orig_async_init = httpx.AsyncClient.__init__
            def _resilient_async_init(self, *args, **kwargs):
                if 'timeout' not in kwargs or kwargs['timeout'] is None or kwargs['timeout'] == 5.0:
                    kwargs['timeout'] = httpx.Timeout(60.0, connect=60.0, read=60.0, write=60.0, pool=60.0)
                return _orig_async_init(self, *args, **kwargs)
            httpx.AsyncClient.__init__ = _resilient_async_init

        # Patch Client default timeout
        if hasattr(httpx, 'Client'):
            _orig_client_init = httpx.Client.__init__
            def _resilient_client_init(self, *args, **kwargs):
                if 'timeout' not in kwargs or kwargs['timeout'] is None or kwargs['timeout'] == 5.0:
                    kwargs['timeout'] = httpx.Timeout(60.0, connect=60.0, read=60.0, write=60.0, pool=60.0)
                return _orig_client_init(self, *args, **kwargs)
            httpx.Client.__init__ = _resilient_client_init
    except Exception:
        pass

def _patch_telegram():
    if 'telegram' in _patched_modules:
        return
    _patched_modules.add('telegram')
    try:
        import telegram
        # Patch HTTPXRequest default parameters (connect_timeout, read_timeout, write_timeout, pool_timeout)
        if hasattr(telegram, 'request') and hasattr(telegram.request, 'HTTPXRequest'):
            _OrigReq = telegram.request.HTTPXRequest
            _orig_req_init = _OrigReq.__init__
            def _resilient_req_init(self, *args, **kwargs):
                if 'connect_timeout' not in kwargs or kwargs['connect_timeout'] is None or kwargs['connect_timeout'] == 5.0:
                    kwargs['connect_timeout'] = 60.0
                if 'read_timeout' not in kwargs or kwargs['read_timeout'] is None or kwargs['read_timeout'] == 5.0:
                    kwargs['read_timeout'] = 60.0
                if 'write_timeout' not in kwargs or kwargs['write_timeout'] is None or kwargs['write_timeout'] == 5.0:
                    kwargs['write_timeout'] = 60.0
                if 'pool_timeout' not in kwargs or kwargs['pool_timeout'] is None or kwargs['pool_timeout'] == 1.0:
                    kwargs['pool_timeout'] = 60.0
                return _orig_req_init(self, *args, **kwargs)
            _OrigReq.__init__ = _resilient_req_init

        # Patch ApplicationBuilder so default builder uses resilient request config
        from telegram.ext._applicationbuilder import ApplicationBuilder
        _orig_app_build = ApplicationBuilder.build
        def _resilient_app_build(self):
            if getattr(self, '_request', None) is None:
                import telegram.request
                self.request(telegram.request.HTTPXRequest(
                    connect_timeout=60.0,
                    read_timeout=60.0,
                    write_timeout=60.0,
                    pool_timeout=60.0,
                    connection_pool_size=8
                ))
            if getattr(self, '_get_updates_request', None) is None:
                import telegram.request
                self.get_updates_request(telegram.request.HTTPXRequest(
                    connect_timeout=60.0,
                    read_timeout=60.0,
                    write_timeout=60.0,
                    pool_timeout=60.0,
                    connection_pool_size=8
                ))
            return _orig_app_build(self)
        ApplicationBuilder.build = _resilient_app_build

        # Patch network retry loop to allow retries on initial getMe / initialize handshake
        try:
            import telegram.ext._utils.networkloop as _nloop
            _orig_network_retry_loop = _nloop.network_retry_loop
            async def _resilient_network_retry_loop(action_cb, *args, **kwargs):
                if 'max_retries' in kwargs and kwargs['max_retries'] == 0:
                    kwargs['max_retries'] = 3
                return await _orig_network_retry_loop(action_cb, *args, **kwargs)
            _nloop.network_retry_loop = _resilient_network_retry_loop
        except Exception:
            pass
    except Exception:
        pass

def _patch_requests():
    if 'requests' in _patched_modules:
        return
    _patched_modules.add('requests')
    try:
        import requests
        _orig_req = requests.Session.request
        def _resilient_requests_req(self, method, url, *args, **kwargs):
            if 'timeout' not in kwargs or kwargs['timeout'] is None:
                kwargs['timeout'] = 60.0
            return _orig_req(self, method, url, *args, **kwargs)
        requests.Session.request = _resilient_requests_req
    except Exception:
        pass

def _patch_aiohttp():
    if 'aiohttp' in _patched_modules:
        return
    _patched_modules.add('aiohttp')
    try:
        import aiohttp
        _orig_client_session_init = aiohttp.ClientSession.__init__
        def _resilient_session_init(self, *args, **kwargs):
            if 'timeout' not in kwargs or kwargs['timeout'] is None or (hasattr(kwargs['timeout'], 'total') and kwargs['timeout'].total == 300):
                kwargs['timeout'] = aiohttp.ClientTimeout(total=60.0, connect=60.0, sock_connect=60.0, sock_read=60.0)
            return _orig_client_session_init(self, *args, **kwargs)
        aiohttp.ClientSession.__init__ = _resilient_session_init
    except Exception:
        pass

def _resilient_import(name, *args, **kwargs):
    mod = _orig_import(name, *args, **kwargs)
    if name == 'httpx' or name.startswith('httpx.'):
        _patch_httpx()
    elif name == 'telegram' or name.startswith('telegram.'):
        _patch_httpx()
        _patch_telegram()
    elif name == 'requests' or name.startswith('requests.'):
        _patch_requests()
    elif name == 'aiohttp' or name.startswith('aiohttp.'):
        _patch_aiohttp()
    return mod

builtins.__import__ = _resilient_import
`;

    try {
      fs.writeFileSync(siteCustomizePath, pythonCode, 'utf-8');
    } catch (err) {
      console.error('[PythonResiliencyEngine] Failed to write sitecustomize.py:', err);
    }
  }
}
