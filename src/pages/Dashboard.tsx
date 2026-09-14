export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">Daily Goal</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">0 / 15 <span className="text-sm font-normal text-gray-500">mins</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">Reviews Pending</h2>
          <p className="text-3xl font-bold text-orange-500 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">Current Streak</h2>
          <p className="text-3xl font-bold text-green-500 mt-2">0 <span className="text-sm font-normal text-gray-500">days</span></p>
        </div>
      </div>
    </div>
  );
}
