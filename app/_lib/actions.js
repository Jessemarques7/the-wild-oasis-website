"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import {
  createBooking,
  deleteBooking,
  getBookings,
  updateBooking,
  updateGuest,
} from "./data-service";
import { redirect } from "next/navigation";

export async function UpdateProfile(formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationality, countryFlag, nationalID };

  updateGuest(session.user.guestId, updateData);
  revalidatePath("/account/profile");
}

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function deleteReservation(id) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingIds.includes(id))
    throw new Error("You are not allowed to delete this booking");

  deleteBooking(id);
  revalidatePath("/account/reservations");
}

export async function UpdateReservation(formData) {
  const numGuests = Number(formData.get("numGuests"));
  const observations = formData.get("observations").slice(0, 1000);
  const bookingId = Number(formData.get("bookingId"));

  // 1) Authentication
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // 2) Authorization
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);
  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to update this booking");

  // 3) Building update data
  const updateData = { numGuests, observations };

  // 4) Updating
  updateBooking(bookingId, updateData);

  // 5) Revalidation
  revalidatePath(`/account/reservations/edit/${bookingId}`);
  revalidatePath("/account/reservations");

  // 6) Redirecting
  redirect("/account/reservations");
}

export async function createReservation(bookingData, formData) {
  // 1) Authentication
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // 2) Building booking data
  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
    status: "unconfirmed",
  };

  // 3) Creating booking

  createBooking(newBooking);

  // 4) Revalidation

  revalidatePath(`/cabins/${bookingData.cabinId}`);

  // // 5) Redirecting
  redirect("/cabins/thankyou");
}
