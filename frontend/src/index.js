import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
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

class ViewGitHub extends React.Component {
    render() {
        return (
            <a className="viewGit" href="https://github.com/antoniocosentino/technoland">View on Github</a>
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
            yesNo       : '',
            isPlaying   : false,
        };

        this.accessToken = '';
        this.isTechno = false;
        this.fetchInfo = this.fetchInfo.bind(this);
    };

    fetchInfo(loading) {
        spotifyApi.setAccessToken(this.accessToken);
        spotifyApi.getMyCurrentPlayingTrack()
        .then(data => {
            if (data.body.item){
                spotifyApi.searchArtists(data.body.item.artists[0].name)
                .then((artistData) => {
                    const needle = [ 'techno', 'electro house', 'destroy techno'];
                    const genreFilter =  needle.some(function (v) {
                        return artistData.body.artists.items[0].genres.indexOf(v) >= 0;
                    });

                    console.log(artistData.body.artists.items[0].genres);
                    console.log('genreFilter', genreFilter);

                    if (genreFilter){
                        this.isTechno = true;
                        console.log('setting istechno to true');
                    }
                    else {
                        this.isTechno = false;
                        console.log('setting istechno to false');
                    }
                }, function(err) {
                    console.error(err);
                });

                var isPlaying = false;

                if (data.body.is_playing) {
                    isPlaying = true;
                    console.log('is techno is', this.isTechno);

                    if (this.isTechno){
                        console.log('setting yesno to yes');
                        this.setState( { yesNo : 'YES' } );
                    }
                    else {
                        console.log('setting yesno to no');
                        this.setState( { yesNo : 'NO' } );
                    }
                }
                else {
                    isPlaying = false;
                    document.title = "Is Antonio in the land of Techno?";
                }

                this.setState( {
                    albumImg  : data.body.item.album.images[0].url,
                    artist    : data.body.item.artists[0].name,
                    title     : data.body.item.name,
                    loading   : false,
                    isPlaying : isPlaying,
                } );

                document.title = `${data.body.item.artists[0].name} - ${data.body.item.name}`;
            }
        },
        function(err) {
            console.error(err);
        });

        setTimeout(this.fetchInfo, 10000);
    }

    componentDidMount() {
        request(process.env.REACT_APP_API_URL, (error, response, body) => {
            if (error) {
                console.log('error:', error);
            }
            else {
                const responseObj = JSON.parse(body);
                this.accessToken = responseObj.access_token;
                this.fetchInfo();
            }
        });
    }

    render() {
        return (
            <div>
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
                <ViewGitHub />
            </div>
        );
    }
}



ReactDOM.render(
    <Techno />,
    document.getElementById('root')
);





