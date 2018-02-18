import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
require('dotenv').config()
const SpotifyWebApi = require('spotify-web-api-node');
const request = require('request');

const spotifyApi = new SpotifyWebApi({
    clientId : process.env.REACT_APP_SPOTIFY_CLIENT_ID,
    clientSecret : process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
});

class AppTitle extends React.Component {
    render() {
        return (
          <h1>Is Antonio in the land of Techno?</h1>
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

class SongInfo extends React.Component {
    render() {
        return (
            <div>
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
            <span>Antonio is not listening to music right now. Come back soon! :)</span>
        );
    }
}

class Techno extends React.Component {

    constructor(){
        super();
        this.state = {
            albumImg    : null,
            loading     : true,
            accessToken : null,
            artist      : null,
            title       : null,
            yesNo       : 'NO',
            isPlaying   : false,
            isTechno    : false
        };
    };

    componentDidMount() {
        request('http://localhost:1811/token', (error, response, body) => {
            if (error) {
                console.log('error:', error);
            }
            else {
                const responseObj = JSON.parse(body);
                this.setState( { accessToken: responseObj.access_token } );
            }
        });
    }

    componentDidUpdate() {
        if (this.state.loading){
            setInterval(() => {
                spotifyApi.setAccessToken(this.state.accessToken);
                spotifyApi.getMyCurrentPlayingTrack()
                .then(data => {
                    if (data.body.item){
                        spotifyApi.searchArtists(data.body.item.artists[0].name)
                        .then((artistData) => {
                            const needle = [ 'techno', 'electro house' ];
                            const genreFilter =  needle.some(function (v) {
                                return artistData.body.artists.items[0].genres.indexOf(v) >= 0;
                            });
                            if (genreFilter){
                                this.setState( { isTechno: true } );
                            }
                            else {
                                this.setState( { isTechno: false } );
                            }
                        }, function(err) {
                            console.error(err);
                        });
                        this.setState( { albumImg: data.body.item.album.images[0].url } );
                        this.setState( { artist: data.body.item.artists[0].name } );
                        this.setState( { title: data.body.item.name } );
                        this.setState( { loading: false } );
                        if (data.body.is_playing) {
                            this.setState( { isPlaying: true } );
                            if (this.state.isTechno){
                                this.setState( { yesNo: 'YES' } );
                            }
                            else {
                                this.setState( { yesNo: 'NO' } );
                            }
                        }
                        else {
                            this.setState( { isPlaying: false } );
                            this.setState( { yesNo: 'NO' } );
                        }
                    }
                },
                function(err) {
                    console.error(err);
                });
            }, 10000);
        }
    }

    render() {
        return (
          <div className="technoContainer">
            <AppTitle />
            { this.state.loading &&
                <Loading />
            }
            { !this.state.loading &&
                <div className="albumWrapper">
                    <YesNo answer={ this.state.yesNo } />
                    { this.state.isPlaying &&
                        <div>
                            <AlbumCover albumImg={ this.state.albumImg } />
                            <Eq />
                            <SongInfo artist={ this.state.artist } title={ this.state.title } />
                        </div>
                    }
                    { !this.state.isPlaying &&
                        <NotListening />
                    }
                </div>
            }
          </div>
        );
    }
}



ReactDOM.render(
    <Techno />,
    document.getElementById('root')
);





