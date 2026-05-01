import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// ✅ Fetch + Save movies + RETURN movies (OPTIMIZED)
export const getNowPlayingMovies = async (req, res) => {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.TMDB_API_KEY}`
        );

        const data = await response.json();

        if (!data.results) {
            return res.json({ success: false, message: "No data from TMDB" });
        }

        // Save movies in bulk with bulkWrite for better performance
        const operations = data.results.map(movie => ({
            updateOne: {
                filter: { _id: movie.id },
                update: {
                    $set: {
                        _id: movie.id,
                        title: movie.title,
                        overview: movie.overview,
                        poster_path: movie.poster_path,
                        backdrop_path: movie.backdrop_path,
                        release_date: movie.release_date,
                        original_language: movie.original_language,
                        vote_average: movie.vote_average,
                    }
                }
            }
        }));

        if (operations.length > 0) {
            await Movie.bulkWrite(operations);
        }

        // ✅ IMPORTANT FIX (for admin page)
        res.json({
            success: true,
            movies: data.results,
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ Add show (FIXED CAST)
export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice } = req.body;

        let movie = await Movie.findById(movieId);

        if (!movie) {
            const [movieDetails, movieCredits] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`).then(res => res.json()),
                fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${process.env.TMDB_API_KEY}`).then(res => res.json())
            ]);

            movie = await Movie.create({
                _id: movieId,
                title: movieDetails.title,
                overview: movieDetails.overview,
                poster_path: movieDetails.poster_path,
                backdrop_path: movieDetails.backdrop_path,
                genres: movieDetails.genres,

                // ✅ FIXED CAST
                casts: movieCredits.cast?.slice(0, 10) || [],

                release_date: movieDetails.release_date,
                original_language: movieDetails.original_language,
                tagline: movieDetails.tagline || "",
                vote_average: movieDetails.vote_average,
                runtime: movieDetails.runtime,
            });
        }

        const showsToCreate = [];

        showsInput.forEach((show) => {
            show.time.forEach((time) => {
                showsToCreate.push({
                    movie: movieId,
                    showDateTime: new Date(`${show.date}T${time}`),
                    showPrice,
                    occupiedSeats: {},
                });
            });
        });

        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }

        await inngest.send({
            name: "app/show.added",
            data: { movieTitle: movie.title },
        });

        res.json({ success: true, message: "Show Added successfully." });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ Get all shows (OPTIMIZED)
export const getShows = async (req, res) => {
    try {
        const shows = await Show.find({
            showDateTime: { $gte: new Date() },
        })
        .populate("movie")
        .sort({ showDateTime: 1 })
        .lean();

        const uniqueMovies = [];
        const seen = new Set();

        shows.forEach((show) => {
            if (show.movie && !seen.has(show.movie._id.toString())) {
                seen.add(show.movie._id.toString());
                uniqueMovies.push(show.movie);
            }
        });

        // fallback
        if (uniqueMovies.length === 0) {
            const movies = await Movie.find().sort({ release_date: -1 }).lean();
            return res.json({ success: true, shows: movies });
        }

        res.json({ success: true, shows: uniqueMovies });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ Get single show (OPTIMIZED)
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;

        const shows = await Show.find({
            movie: movieId,
            showDateTime: { $gte: new Date() },
        }).lean();

        const movie = await Movie.findById(movieId).lean();

        const dateTime = {};

        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split("T")[0];

            if (!dateTime[date]) dateTime[date] = [];

            dateTime[date].push({
                time: show.showDateTime,
                showId: show._id,
            });
        });

        res.json({ success: true, movie, dateTime });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ NEW: Delete show
export const deleteShow = async (req, res) => {
    try {
        const { id } = req.params;

        await Show.findByIdAndDelete(id);

        res.json({ success: true, message: "Show deleted successfully" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};