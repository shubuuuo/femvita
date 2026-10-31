import Link from "next/link";

export const metadata = { title: "FemVita | Welcome" };

const features = [
  {
    title: "Track your cycle",
    text: "Log periods, symptoms and temperature, and see estimates for your next period and fertile window.",
  },
  {
    title: "Wellness for every phase",
    text: "Meal ideas, movement and health topics that fit where you are in your cycle.",
  },
  {
    title: "A supportive community",
    text: "Share experiences and ask questions, anonymously if you prefer.",
  },
];

export default function Welcome() {
  return (
    <main className="min-h-screen bg-[#F8F4FF] px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-semibold text-[#B19CD9]">FemVita</h1>
        <p className="mt-4 text-lg text-[#4F4F4F]">
          One calm place for your cycle, your wellness and your community.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-[#B19CD9] px-6 py-2.5 font-medium text-white hover:opacity-90"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[#B19CD9] bg-white px-6 py-2.5 font-medium text-[#B19CD9] hover:bg-[#EEDDFF]"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-[#4F4F4F]">{f.title}</h2>
              <p className="mt-2 text-sm text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-gray-500">
          FemVita shares general information and cycle estimates. It isnt a
          substitute for professional medical advice.
        </p>
      </div>
    </main>
  );
}
