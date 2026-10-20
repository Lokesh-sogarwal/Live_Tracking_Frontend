import React from "react";
import PeopleDirectory from "../People/PeopleDirectory";

// Users page (non-driver accounts). Shares its implementation with the Drivers page.
const UserDetails = () => <PeopleDirectory mode="users" />;

export default UserDetails;
