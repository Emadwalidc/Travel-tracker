import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import { createClient } from '@supabase/supabase-js';

env.config();
const supabaseUrl = 'https://tzfcrovhmnhllcuvsawk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

// Fetch visited countries for a user
async function checkVisisted() {
  const { data, error } = await supabase
    .from('visited_countries')
    .select('country_code')
    .eq('user_id', currentUserId);

  if (error) {
    console.log(error);
    return [];
  }

  return data.map(country => country.country_code);
}

// Get current user details
async function getCurrentUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', currentUserId)
    .single();

  if (error) {
    console.log(error);
    return {};
  }

  return data;
}

// Fetch all users for rendering
async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.log(error);
    return [];
  }

  return data;
}

// Home route
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  const allUsers = await getAllUsers();  // Fetch all users

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: allUsers,  // Pass all users to the template
    color: currentUser.color,
  });
});

// Add a country to visited countries
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('country_code')
      .ilike('country_name', `%${input.toLowerCase()}%`)
      .single();

    if (error || !data) {
      console.log(error);
      return res.status(404).send("Country not found");
    }

    const countryCode = data.country_code;

    const { error: insertError } = await supabase
      .from('visited_countries')
      .insert([ 
        { country_code: countryCode, user_id: currentUserId }
      ]);

    if (insertError) {
      console.log(insertError);
    }

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// Switch user or create a new user
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

// Create a new user
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const { data, error } = await supabase
    .from('users')
    .insert([
      { name: name, color: color }
    ])
    .single();  // .single() ensures it returns a single row

  if (error) {
    console.log(error); // Log the error for debugging
    return res.redirect("/"); // Redirect to home page even if there is an error
  }

  if (!data) {
    console.log("No user data returned");
    return res.redirect("/"); // Redirect to home page if no user data is returned
  }

  currentUserId = data.id;  // Set the newly created user's ID as the current user
  res.redirect("/"); // Redirect to home page after successful user creation
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
