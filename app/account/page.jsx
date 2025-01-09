import { auth } from "../_lib/auth";

async function page() {
  const session = await auth();

  return (
    <h2 className="font-semibold text-2xl text-accent-400 mb-7">
      Welcome, {session.user.name}
    </h2>
  );
}

export default page;
