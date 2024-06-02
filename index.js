import http, { get } from 'node:http'
import open from 'open'
export let connection = {
  endpoints: {
    code: 'https://id.twitch.tv/oauth2/authorize',
    token: 'https://id.twitch.tv/oauth2/token',
    validate: 'https://id.twitch.tv/oauth2/validate',
  },
  client_id: '',
  client_secret: '',
  redirect_uri: '',
  scopes: [],
  code: {},
  token: {},
}

export function setConfig(config){
  connection.client_id = config.client_id
  connection.client_secret = config.client_secret
  connection.redirect_uri = config.redirect_uri
  connection.scopes = config.scopes
}

//Run get to authorize on browser and retrieve code
export const getCodeToken = function () {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req,res) => {
      const queryParams = new URLSearchParams(req.url.substring(1, req.url.length))
      let ok = false;
      if (queryParams.has('code') &&
          queryParams.has('scope')){
        connection.code.code = queryParams.get('code')
        connection.code.scope = queryParams.get('scope').split(" ")
        res.writeHead(200, {
          "Content-Type": "text/html"
        })
        res.end('You can close this page')
        ok = true;
      } else {
        res.writeHead(404, {
          "Content-Type": "text/html"
        })
        res.end('Could not get code or scope in response')
      }
      server.close()
      if (ok){
        resolve({
          code: queryParams.get('code'),
          scope: queryParams.get('scope')
        })
      } else {
        reject({
          error: 'Could not get code or scope'
        })
      }
    }).listen(3000, (req) => {
      if (connection.endpoints.code == null || connection.endpoints.code === ""){
        throw new Error('endpoint_code not valid.')
        return
      }
      if (connection.client_id == null || connection.client_id === ""){
        throw new Error('Client_ID not valid.')
        return
      }
      if (connection.client_secret == null || connection.client_secret === ""){
        throw new Error('client_secret not valid.')
        return
      }
      if (connection.redirect_uri == null || connection.redirect_uri === ""){
        throw new Error('redirect_uri not valid.')
        return
      }
      if (!connection.scopes instanceof Array){
        throw new Error('scopes is not an Array.')
        return
      }
      const url = connection.endpoints.code + '?' + new URLSearchParams({
        client_id: connection.client_id,
        redirect_uri: connection.redirect_uri,
        response_type: 'code',
        scope: connection.scopes.join(' ')
      })
      open(url)
    })
  })
}

export const getAccessToken = function (isRefreshToken){
  let body;
  if (isRefreshToken) {
    body = JSON.stringify({
      client_id: connection.client_id,
      client_secret: connection.client_secret,
      grant_type: 'refresh_token',
      refresh_token: connection.token.refresh_token
    })
  } else {
    body = JSON.stringify({
      client_id: connection.client_id,
      client_secret: connection.client_secret,
      code: connection.code.code,
      grant_type: 'authorization_code',
      redirect_uri: connection.redirect_uri
    })
  }
  return fetch(connection.endpoints.token, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json"
    }),
    body: body
  })
  .then((response) => response.json())
  .then((responseAsJson) => {
    connection.token = responseAsJson
    return responseAsJson
  })
}

export const getValidateToken = function(){
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `OAuth ${connection.token.access_token}`)
    fetch(connection.endpoints.validate, {
      method: 'GET',
      headers: headers
    })
    .then((response) => {
      if (response.ok){
        resolve({
          status: 200,
          message: 'OK'
        })
      } else {
        reject({
          status: 401,
          message: 'Unauthorized'
        })
      }
    })
  })
}

export const getRefreshToken = function(){
  return getAccessToken(true)
}


export default {
  connection: connection,
  setConfig: setConfig,
  getCodeToken: getCodeToken,
  getAccessToken: getAccessToken,
  getRefreshToken: getRefreshToken,
  getValidateToken: getValidateToken
}
// getCodeToken()
// .then(() => getAccessToken())
// .then((e) => console.log("access_token"))
// .then((e) => console.log(connection.token.access_token))
// .then(() => getValidateToken())
// .then(() => getRefreshToken())
// .then((e) => console.log("RefreshToken"))
// .then((e) => console.log(connection.token.access_token))
// .catch((e) => {throw new Error(e.status)})