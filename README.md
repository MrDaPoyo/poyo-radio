![Logo](readme/logo.png)
# Code N Chill
An *electronic radio* based on __websockets__ that includes a chatroom!

# How can I run my own Code N Chill radio?

It's _fairly simple_! All you've got to do is:
1. Clone the repository:
    ```sh
    git clone https://github.com/MrDaPoyo/poyo-radio
    ```
2. Navigate to the project directory:
    ```sh
    cd poyo-radio
    ```
3. Install the dependencies:
    ```sh
    npm install
    ```
4. Start the server:
    ```sh
    node .
    ```

And voilá! It's now up and running.

# How it works?

**Code N Chill** works using WebSockets, which are a kind of two way connection protocol, unlike HTTP requests. 
It is also a stateful protocol, which means the connection between client and server will stay alive until it gets terminated by either party (client or server). After closing the connection by either of the client or server, the connection is terminated from both ends. 

Here's a scheme of how the Radio works:

1. The system chooses a song:

    The first song that plays is absolutely random, but before we choose it, we need to initialize some variables as shown below:
    
    ```js
    var songLength = 0;
    var currentSong = null;
    var songStartTime = 0;
    var elapsedTime = 0;
    ```
    
    Then, the system runs a function called `randomSong()`, which reads `songs.json` (a file with data about each and every song) and then executes ``findSong()``, which searches for the selected random song and then retrieves metadata about it and assigns the metadata to the variable ``currentSong``.
2. A user connects
    
    Once a user connects, a packet called ``currentTrack`` is sent to the frontend, to synchronize the player with the other listeners.
    This package contains three variables: 
    1.  ``currentSong``: Data about the current song playing.
    2.  ``elapsedTime``: The synced timer that started when ``randomSong()`` is invoked.
    3.  ``songLength``: The length in seconds of the current song playing.
    
    This data is received on the client and used to start playing the selected song.

3. The song finishes
    
    Once a song finishes, a new song is selected using the following code snipptet:
    ```js
    setInterval(async () => {
        elapsedTime++;
        if (elapsedTime >= songLength) {
            elapsedTime = 0;
            randomSong();
            await new Promise(resolve => setTimeout(resolve, 2000));
            io.emit('currentTrack', currentSong, elapsedTime, songLength);
        }
    }, 1000);
    ```
    If you haven't noticed yet, it's the script for the timer! It serves two purposes: update ``elapsedTime`` and, when a song finishes (``elapsedTime >= songLength``), it resets ``elapsedTime`` and proceeds to choose a new song! After it's chosen, it sends another ``currentTrack`` packet with the new track info.

# How do usernames and chats work?

It's way simpler than how the actual *electronic radio* works.