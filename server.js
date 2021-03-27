/**
 * Developed by Noor Fakhry
 */

/**
 This script will do the following:
 - Let the user log in and authorize the app
 - get authorization code from spotify accounts endpoint
 - use this code to get acces and refresh tokens 
   from spotify token endpoint
 - redirect the user back to the client app with the tokens
 */

 const express = require('express');
 const request = require('request');
 const querystring = require('querystring');
 const cookieParser = require('cookie-parser');
 const cors = require('cors');
 const path = require('path');
 const app = express();
 const port = 8888;
 app.use(cors()).use(cookieParser());
 
 const clientId = process.env.CLIENT_ID;
 const clientSecret = process.env.CLIENT_SECRET;
 const redirectUri = `http://localhost:${port}/getTokens`;
 const clientAppUri = 'http://localhost:8888/homePage';
 let refreshToken;
 
 /**
  * Generating a random string 
  * @param  {number} length The length of the string
  * @return {string} The generated string
  */
 const generateRandomString = (length) => {
 let text = '';
 const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
 for (let i = 0; i < length; i++) {
   text += possible.charAt(Math.floor(Math.random() * possible.length));
 }
 return text;
 };
 
 const stateKey = 'spotify_auth_state';
 
 // handle login request
 app.get('/login', (req, res) => {
   const state = generateRandomString(16);
   // create a cookie
   res.cookie(stateKey, state);
   const scopes = 'streaming user-read-private user-read-email user-read-playback-state user-modify-playback-state user-library-read user-library-modify user-read-recently-played';
   const authorizeEndPoint = 'https://accounts.spotify.com/authorize?' +
   querystring.stringify({
     response_type: 'code',
     client_id: clientId,
     scopes: scopes,
     redirect_uri: redirectUri,
     state: state
   });
   // redirect to the spotify accounts authorize endpoint
   // i expect it returns an authorization code
   res.redirect(authorizeEndPoint);
 });
 
 // handle getTokens request
 app.get('/getTokens', (req, res) => {
   const authorizationCode = req.query.code || null;
   const state = req.query.state || null;
   const storedState = req.cookies ? req.cookies[stateKey] : null;
   if(state === null || state !== storedState) {
     res.redirect('/#' + querystring.stringify({
       error: 'state_mismatch'
     }))
   } else {
     res.clearCookie(stateKey);
     const options = {
       url: 'https://accounts.spotify.com/api/token',
       form: {
         code: authorizationCode,
         redirect_uri: redirectUri,
         grant_type: 'authorization_code'
       },
       headers: {
         'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
       },
       json: true
     };
     // request access and refresh tokens
     // and return them in the client app home page url
     request.post(options, (error, response, body) => {
       if(!error && response.statusCode === 200) {
         accessToken = body.access_token;
         refreshToken = body.refresh_token;
         res.redirect(clientAppUri + '/#' + querystring.stringify({
           accessToken,
         })  );
       } else {
         res.redirect(clientAppUri + querystring.stringify({
           error: 'invalid token'
         }))
       };
     })
   }
 });
 
 
 // handle newAccessToken request
 // which will generate new access token using the refresh token
 app.get('/newAccessToken', (req, res) => {
   let newAccessToken;
   const authOptions = {
     url: 'https://accounts.spotify.com/api/token',
     headers: { 'Authorization': 'Basic ' + ( Buffer.from(clientId + ':' + clientSecret).toString('base64')) },
     form: {
       grant_type: 'refresh_token',
       refresh_token: refreshToken
     },
     json: true
   };
   request.post(authOptions, function(error, response, body) {
     if (!error && response.statusCode === 200) {
       newAccessToken = body.access_token;
       res.send({
         accessToken: newAccessToken
       });
     };
   });
 });

 app.use(express.static(path.join(__dirname, 'build')));

 app.get('/*', function (req, res) {
   res.sendFile(path.join(__dirname, 'build', 'index.html'));
 });
 
 app.listen(port, () => {
   console.log(`Listineng on port ${port}`);
 });
 
