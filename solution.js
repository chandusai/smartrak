
const fs = require('fs');
const csv = require('csv-parser');
const json2csv = require ('json2csv').parse;
const { DateTime } = require('luxon');

class GeofencePeriod {
    constructor(VehicleId, EnterTime, ExitTime) {
        this.VehicleId = VehicleId;
        this.EnterTime = EnterTime;
        this.ExitTime = ExitTime;
    }
}
// Function to check if a given timestamp falls within a geofence
function isInsideGeofence(timestamp, geofence) {
    const time = new Date(timestamp).getTime();

    const startTime = new Date(geofence.start).getTime();
    const endTime = new Date(geofence.end).getTime();
    if (time >= startTime && time <= endTime) {
        return true;
    }


    return false;
}
// Helper function to get ISO week number from date
function getWeekNumber(date) {
    const weekYear = date.weekYear;
    const weekNumber = date.weekNumber;
    return `${weekYear}-W${weekNumber}`;
}
function convertToLocalTime(universalTimeStr) {
    const utcDateTime = new Date(universalTimeStr);
    const localDateTime = DateTime.fromJSDate(utcDateTime).toLocal();
    return localDateTime
}
function calculateAvailability(geofencePeriods, startDate, endDate, geofences) {
    const timeSlotMinutes = 15;
    const totalMinutes = 7 * 24 * 60 / timeSlotMinutes; // Total 15-minute periods in a week
    const availabilityTables = {}; // Object to hold availability tables for each week
    const vehicleAvailability = {}; // Object to hold total availability time for each vehicle in minutes

    geofencePeriods.forEach((period) => {
        const { VehicleId, EnterTime, ExitTime } = period;
        const enterTime = convertToLocalTime(EnterTime);
        const exitTime = convertToLocalTime(ExitTime);
        const weekNumber = getWeekNumber(enterTime);

        // Initialize availability table for the week if not already created
        if (!availabilityTables[weekNumber]) {
            availabilityTables[weekNumber] = Array.from({ length: totalMinutes }, () => 0);
        }

        let availability = 0;
        for (let i = 0; i < totalMinutes; i++) {
            const currentTime = enterTime.plus({ minutes: i * timeSlotMinutes });
            if (currentTime >= enterTime && currentTime < exitTime && isInsideGeofence(currentTime, geofences)) {
                availability++;
            }
        }

        availabilityTables[weekNumber][VehicleId] = availability * 15 / 60;

        // Calculate the availability time in minutes for this geofence period
        const availabilityTime = Math.min(exitTime.diff(enterTime, 'minutes').minutes, 8 * 60 + 30);
        if (!vehicleAvailability[weekNumber]) {
            vehicleAvailability[weekNumber] = {}
        }
        if (vehicleAvailability[weekNumber][VehicleId]) {
            vehicleAvailability[weekNumber][VehicleId] += availability * 15 / 60;
        } else {
            vehicleAvailability[weekNumber][VehicleId] = availability * 15 / 60;
        }
    });
    console.log("vehicleAvailability", vehicleAvailability);
    // Calculate the number of vehicles for each week
    const vehiclesPerWeek = {};
    for (const weekNumber in availabilityTables) {
        // Get the vehicles with at least one availability slot in the week
        const vehiclesInWeek = Object.keys(availabilityTables[weekNumber]).filter((vehicleId) => availabilityTables[weekNumber][vehicleId] > 0);
        console.log("vehciles", vehiclesInWeek)
        vehiclesPerWeek[weekNumber] = vehiclesInWeek.length;
    }
    // Convert the vehicle availability to hours per week
    const hoursPerWeek = {};

    for (const key in vehicleAvailability) {
        let sum = 0
        for (const innerKey in vehicleAvailability[key]) {
            sum += vehicleAvailability[key][innerKey];
        }
        hoursPerWeek[key] = sum; 
    }

    return { vehiclesPerWeek, hoursPerWeek };
}



// Load the CSV file and populate the geofencePeriods array
const geofencePeriods = [];
fs.createReadStream('GeofencePeriods.csv')
    .pipe(csv())
    .on('data', (row) => {
        const period = new GeofencePeriod(
            parseInt(row.vehicleid),
            row.entertime,
            row.exittime
        );
        geofencePeriods.push(period);
    })
    .on('end', () => {
        let timeSlotMinutes = 15;
        // Specify the date range from 01-06-2023 to 30-06-2023
        const startDate = DateTime.fromISO('2023-06-01', { zone: 'utc' }).toLocal();
        const endDate = DateTime.fromISO('2023-06-30', { zone: 'utc' }).toLocal().plus({ days: 1 }); // Include the end date

        // Calculate availability tables and vehicle hours for the specified date range
        const { vehiclesPerWeek, hoursPerWeek } = calculateAvailability(geofencePeriods, startDate, endDate, { start: '2023-06-01T08:30:00Z', end: '2023-06-30T17:00:00Z' });

        // Calculate the total number of vehicles for the entire period
        let totalVehicles = 0;
        for (const weekNumber in vehiclesPerWeek) {
            totalVehicles += vehiclesPerWeek[weekNumber];
        }

        // Print the total number of vehicles for the entire period
        console.log(`Total Number of Vehicles: ${totalVehicles}`);

        // Print results week by week
        let finalOutput=[];       
        for (const weekNumber in vehiclesPerWeek) {  
            let finalObj={};        
            const totalVehiclesInWeek = vehiclesPerWeek[weekNumber];
            const totalHoursInWeek = hoursPerWeek[weekNumber] || 0; // If no hours available, consider 0
            console.log(`Week ${weekNumber}:`); 
            finalObj['weekNumber']=weekNumber;                     
            console.log(`Total Number of Vehicles in Week: ${totalVehiclesInWeek}`);
            finalObj['vehiclesPerWeek'] = totalVehiclesInWeek;        
            console.log(`Total Hours per Week: ${totalHoursInWeek.toFixed(2)}\n`); 
            finalObj['totalHoursInWeek']  = totalHoursInWeek.toFixed(2);
            finalOutput.push(finalObj);  
                      
        }
        // Parsing the data in to CSV file 
        const csvData = json2csv(finalOutput,{});        
        fs.writeFileSync('output.csv',csvData,(err)=>{
            if(err) throw err
            console.log("csv file is saved")
        });
    });
    
   
    



