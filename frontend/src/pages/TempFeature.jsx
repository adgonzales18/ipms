import React from 'react'
import { FaWrench } from 'react-icons/fa'
import { NavLink } from 'react-router'


function TempFeature() {
  return (
    <div className='h-full w-full'>
        <main class="grid min-h-full place-items-center bg-gray-100 px-6 py-24 sm:py-32 lg:px-8">
        <div class="text-center">
            <p className="flex justify-center">
                <FaWrench className="text-gray-800 text-9xl" />
            </p>
            <h1 class="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-800 sm:text-7xl">Under Development</h1>
            <p class="mt-6 text-lg font-medium text-pretty text-gray-700 sm:text-xl/8">Sorry, this feature is currently not available.</p>
            <div class="mt-10 flex items-center justify-center gap-x-6">
            <NavLink to={"/admin"} className="rounded-md bg-gray-800 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Return to Main Dashboard</NavLink>
            </div>
        </div>
    </main>
    </div>
  )
}

export default TempFeature