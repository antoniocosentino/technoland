import React from 'react';
import ReactDOM from 'react-dom';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
const SpotifyWebApi = require('spotify-web-api-node');
const Request = require('request');

const spotifyApi = new SpotifyWebApi({
    clientId : process.env.REACT_APP_SPOTIFY_CLIENT_ID,
    clientSecret : process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
});

class AppTitle extends React.Component {
    render() {
        return (
          <h1>Is { this.props.userName } in the land of Techno?</h1>
        );
    }
}

class Loading extends React.Component {
    loadingImage = require(`./img/loading.gif`);
    render() {
        return (
          <img className="loadingImg" src={ this.loadingImage } alt="Loading" />
        );
    }
}

class YesNo extends React.Component {
    render() {
        return (
          <span className="yesNo">{ this.props.answer }</span>
        );
    }
}

class Eq extends React.Component {
    playingIcon = require(`./img/eq.gif`);
    render() {
        return (
          <img className="playingIcon" src={ this.playingIcon } alt="Eq" />
        );
    }
}

class AlbumCover extends React.Component {
    render() {
        return (
          <img alt="Album Cover" src={ this.props.albumImg } />
        );
    }
}

class GenreTag extends React.Component {
    render() {
        return (
          <span className="tag" key={ this.props.tag }>{ this.props.tag }</span>
        );
    }
}

class SongInfo extends React.Component {
    render() {
        return (
            <div className="songInfo">
                <span className="songArtist">{ this.props.artist }</span>
                 &nbsp;-&nbsp;
                <span className="songTitle">{ this.props.title }</span>
            </div>
        );
    }
}

class NotListening extends React.Component {
    render() {
        return (
            <span>{this.props.userName} is not listening to music right now.</span>
        );
    }
}

class ViewGitHub extends React.Component {
    render() {
        return (
            <a className="viewGit" href="https://github.com/antoniocosentino/technoland"><i className="fa fa-github"></i> View on Github</a>
        );
    }
}

class AreYou extends React.Component {
    render() {
        return (
            <div className="areYou">
                { !this.props.message  &&
                    <span>Are you in the land of techno?</span>
                }
                { this.props.message  &&
                    <span>There was a problem connecting to your Spotify account.<br />Do you want to try again?</span>
                }
                <a href={this.props.link} className="spotifyConnect">Connect with Spotify</a>
            </div>
        );
    }
}

class Separator extends React.Component {
    render() {
        return (
            <div className="separator"></div>
        );
    }
}

class Techno extends React.Component {

    constructor(){
        super();
        this.state = {
            albumImg    : null,
            loading     : true,
            artist      : null,
            title       : null,
            yesNo       : '',
            isPlaying   : false,
            tags        : [],
            connError   : false
        };

        this.accessToken = '';
        this.fetchInfo = this.fetchInfo.bind(this);
        this.connectLink = '';
        this.userName = 'Antonio';
        this.isCustomUser = false;
        this.minimalMode = false;
    };

    generateConnectLink(){
        var scopes = ['user-read-currently-playing', 'user-read-private'],
        redirectUri = process.env.REACT_APP_URL,
        clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        state = 'get-token';

        var spotifyApiConnect = new SpotifyWebApi({
        redirectUri : redirectUri,
        clientId : clientId
        });

        var authorizeURL = spotifyApiConnect.createAuthorizeURL(scopes, state);
        return authorizeURL;
    }

    getToken(){
        return new Promise((resolve, reject) => {
            Request(process.env.REACT_APP_API_URL, (error, response, body) => {
                if (error) {
                    this.triggerError();
                }
                else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getUserToken(code){
        return new Promise((resolve, reject) => {
            Request(`${process.env.REACT_APP_PUBLIC_API_URL}?code=${code}`, (error, response, body) => {
                if (error) {
                    this.triggerError();
                }
                else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getPlayingInfo() {
        return new Promise((resolve, reject) => {
            spotifyApi.setAccessToken(this.accessToken);
            spotifyApi.getMyCurrentPlayingTrack()
            .then(data => {
                resolve(data);
            },
            (err) => {
                this.triggerError();
            });
        });
    }

    getArtistInfo(artist) {
        return new Promise((resolve, reject) => {
            spotifyApi.setAccessToken(this.accessToken);
            spotifyApi.searchArtists(artist)
            .then((artistData) => {
                resolve(artistData);
            },
            (err) => {
                this.triggerError();
            });
        });
    }

    getMyInfo() {
        return new Promise((resolve, reject) => {
            spotifyApi.setAccessToken(this.accessToken);
            spotifyApi.getMe()
            .then((userData) => {
                resolve(userData);
            },
            (err) => {
                this.triggerError();
            });
        });
    }

    triggerError() {
        this.setState( {
            isPlaying : false,
            yesNo     : 'NO',
            loading   : false
        } );
    }

    parseQueryString() {
        var str = window.location.search;
        var objURL = {};

        str.replace(
            new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
            function( $0, $1, $2, $3 ){
                objURL[ $1 ] = $3;
            }
        );
        return objURL;
    };

    fetchInfo() {
        this.getPlayingInfo().then((playingInfo) => {
            if (playingInfo.body && playingInfo.body.is_playing) {
                this.getArtistInfo(playingInfo.body.item.artists[0].name).then((artistData) => {

                    const needle = [ 'techno', 'electro house', 'destroy techno', 'german techno', 'tech house', 'minimal techno'];
                    const genreFilter =  needle.some(function (v) {
                        return artistData.body.artists.items[0].genres.indexOf(v) >= 0;
                    });

                    var yesNo = '';

                    if (playingInfo.body.is_playing && genreFilter){
                        yesNo = 'YES';
                    }
                    else {
                        yesNo = 'NO';
                    }

                    if (playingInfo.body.is_playing) {
                        document.title = `${playingInfo.body.item.artists[0].name} - ${playingInfo.body.item.name}`;
                    }
                    else {
                        document.title = `Is ${this.userName} in the land of Techno?`;
                    }

                    this.setState( {
                        albumImg  : playingInfo.body.item.album.images[0].url,
                        artist    : playingInfo.body.item.artists[0].name,
                        title     : playingInfo.body.item.name,
                        loading   : false,
                        isPlaying : playingInfo.body.is_playing,
                        yesNo     : yesNo,
                        tags      : artistData.body.artists.items[0].genres
                    } );

                });
            }
            else {
                this.triggerError();
            }
        });
        setTimeout(this.fetchInfo, 10000);
    }

    componentDidMount() {
        var urlParams = this.parseQueryString();
        
        if ( urlParams.minimal ) {
            this.minimalMode = true;
        }

        if ( urlParams.rotate ) {
            document.body.style.transform = `rotate(${urlParams.rotate}deg)`;
        }

        var receivedCode = urlParams.code;

        if (receivedCode) {
            window.history.replaceState(null, null, window.location.pathname);
            this.getUserToken(receivedCode).then((userToken) => {
                if (userToken.access_token) {
                    this.accessToken = userToken.access_token;
                    this.getMyInfo().then((myInfo) => {
                        this.userName = myInfo.body.display_name;
                        this.isCustomUser = true;
                        this.fetchInfo();
                    });
                }
                else {
                    this.setState( {
                        connError : true,
                        loading   : false
                    });
                }
            });
        }
        else {
            this.getToken().then((responseObj) => {
                this.accessToken = responseObj.access_token;
                this.fetchInfo();
            });
        }

        this.connectLink = this.generateConnectLink();

    }

    render() {

        if ( this.minimalMode ) {
            if ( this.state.isPlaying ) {
                return (
                    <div className="technoContainer">
                        <div>
                            <AlbumCover albumImg={ this.state.albumImg } />
                            <Eq />
                            <SongInfo artist={ this.state.artist } title={ this.state.title } />
                            {this.state.tags.map(tag => (
                                <GenreTag key={ tag } tag={ tag } />
                            ))}
                        </div>
                    </div>
                )
            }

            return (
                <div className="technoContainer">
                    <Loading />
                </div>
            )
        }


        return (
            <div>
                <div className="technoContainer">
                { !this.state.connError &&
                    <AppTitle userName={ this.userName } />
                }
                { this.state.loading &&
                    <Loading />
                }
                { !this.state.loading && !this.state.connError &&
                    <div className="albumWrapper">
                        <YesNo answer={ this.state.yesNo } />
                        { this.state.isPlaying &&
                            <div>
                                <AlbumCover albumImg={ this.state.albumImg } />
                                <Eq />
                                <SongInfo artist={ this.state.artist } title={ this.state.title } />
                                {this.state.tags.map(tag => (
                                    <GenreTag key={ tag } tag={ tag } />
                                ))}
                            </div>
                        }
                        { !this.state.isPlaying &&
                            <NotListening userName={this.userName} />
                        }
                    </div>
                }
                { !this.isCustomUser &&
                    <div>
                        { !this.state.connError &&
                            <Separator />
                        }
                        <AreYou message={ this.state.connError } link={this.connectLink} />
                    </div>
                }
                <Separator />
                <ViewGitHub />
                </div>
            </div>
        );
    }
}



ReactDOM.render(
    <Techno />,
    document.getElementById('root')
);





