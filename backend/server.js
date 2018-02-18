const express        = require('express');
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const cors           = require('cors')
const app            = express();
const SpotifyWebApi  = require('spotify-web-api-node');
const Request        = require('request');
require('dotenv').config();

app.use(cors())
const port = 1811;
app.listen(port, () => {
  console.log('We are live on ' + port);
});

app.get( '/', function ( req, res ) {
    res.send( 'Antonio in the land of Techno API' );
} );

app.get( '/connect', function ( req, res ) {
    var scopes = ['user-read-currently-playing'],
    redirectUri = 'https://www.kultmedia.com/lab/techno/',
    clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID,
    state = 'get-token';

    // Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
    var spotifyApiConnect = new SpotifyWebApi({
    redirectUri : redirectUri,
    clientId : clientId
    });

    // Create the authorization URL
    var authorizeURL = spotifyApiConnect.createAuthorizeURL(scopes, state);
    console.log(authorizeURL);
    res.send(`<a href="${authorizeURL}">Click here</a>`);
} );

app.get( '/token', function ( req, res ) {

    const data = {
        grant_type: 'authorization_code',
        code: process.env.REACT_APP_SPOTIFY_CLIENT_TOKEN,
        redirect_uri: 'https://www.kultmedia.com/lab/techno/',
        client_id: process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        client_secret: process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
    }

    const dataRefresh = {
        grant_type: 'refresh_token',
        refresh_token: process.env.REACT_APP_SPOTIFY_CLIENT_TOKEN,
        client_id: process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        client_secret: process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
    }

    const options = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        json: true,
        form: data
    }

    const optionsRefresh = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        json: true,
        form: dataRefresh
    }

    Request(optionsRefresh, (error, response, body) => {
        if (error) {
            console.log(error);
            res.send(error);
        }
        else {
            console.log(body);
            res.send(body);
        }
    });
});
