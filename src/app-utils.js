import {parse} from 'url';
import querystring from 'querystring';
import {join, resolve, dirname} from 'path';

// Utility methods
function stripSpecialChars(val) {
  if (!val) {
    return val;
  }
  return val.replace(/\?/g, '--').replace(/\//g, '__').replace(/:/g, '~~').replace(/\*/g, '%2A');
}

function getUrlPath(urlParts) {
  return stripSpecialChars((urlParts.pathname || '').replace('/', ''));
}

function getProps(req, match, ignore) {
  let qs;
  let pobj = {};
  if (Array.isArray(match)) {
    for (let m of match) {
      if (m in req.props) {
        pobj[m] = req.props[m];
      }
    }
  } else {
    pobj = req.props;
  }
  if (Array.isArray(ignore)) {
    for (let p of ignore) {
      delete pobj[p];
    }
  }
  qs = querystring.stringify(pobj);
  return stripSpecialChars(qs);
}

function getReqHeaders(req, match) {
  let headers = '';
  if (Array.isArray(match)) {
    for (let header of match) {
      if (header in req.headers) {
        headers = join(headers, stripSpecialChars(header + '/' + req.headers[header]));
      }
    }
  } else {
    for (let key in req.headers) {
      headers = join(headers, stripSpecialChars(key + '/' + req.headers[key]));
    }
  }
  return headers;
}

export function shouldIgnore({url}) {
  return url === '' || url === '/' || url.startsWith('/__');
}

export function resolveMockPath(req, dataRoot) {
  // Mock data directory associated with the API call
  let path = join(req.conf.dir, req.method);
  if (!path) {
    return null;
  }

  // Custom headers
  if (req.conf.matchHeaders) {
    const headers = getReqHeaders(req, req.conf.matchHeaders);
    if (headers) {
      path = join(path, headers);
    }
  }

  // Meta info regarding the request's url, including the query string
  const parts = parse(req.urlToProxy, true);

  if (parts) {
    // REST parameters
    const urlPath = getUrlPath(parts);
    if (urlPath) {
      path = join(path, urlPath);
    }

    // Query string
    const props = getProps(req, req.conf.matchProps, req.conf.ignoreProps);
    if (props) {
      path = join(path, props);
    }
  }

  path = join(dataRoot, path + '.mock');
  console.log(path);
  return path;
}

export function passthru(res, options) {
  res.writeHead(options.code || 200, options.headers);
  res.write(options.body);
  res.end();
}
    
export function errorHandler(res, err) {
  console.error('Request failed: ' + err);
  res.writeHead(500, {'Content-Type': 'text/plain'});
  res.write('An error has occured, please review the logs.');
  res.end();
}